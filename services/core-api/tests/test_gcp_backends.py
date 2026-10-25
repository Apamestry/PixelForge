"""
Mock-based unit tests for the GCS storage backend and Pub/Sub queue (core-api).
These tests never touch real GCP services.
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch, call

# ── configure env BEFORE importing any app code ──────────────────────────────
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("STORAGE_BACKEND", "gcs")
os.environ.setdefault("GCS_BUCKET", "test-bucket")
os.environ.setdefault("SIGNING_SERVICE_ACCOUNT", "sa@project.iam.gserviceaccount.com")
os.environ.setdefault("QUEUE_BACKEND", "pubsub")
os.environ.setdefault("PUBSUB_TOPIC", "projects/proj/topics/export-requests")

import pytest


# =============================================================================
# GCS storage tests
# =============================================================================

class TestGcsSaveFile:
    def test_save_calls_upload(self):
        mock_blob = MagicMock()
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch.dict("sys.modules", {"google.cloud.storage": MagicMock(Client=lambda: mock_client)}):
            from core_api import storage
            storage._gcs_client.cache_clear()
            storage.settings.STORAGE_BACKEND = "gcs"
            storage.settings.GCS_BUCKET = "test-bucket"

            result = storage._gcs_save("users/u1/assets/img.png", b"data")

        mock_bucket.blob.assert_called_once_with("users/u1/assets/img.png")
        mock_blob.upload_from_string.assert_called_once_with(b"data", content_type="image/png")
        assert result == "users/u1/assets/img.png"


class TestGcsDeleteFile:
    def test_delete_calls_blob_delete(self):
        mock_blob = MagicMock()
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch.dict("sys.modules", {"google.cloud.storage": MagicMock(Client=lambda: mock_client)}):
            from core_api import storage
            storage._gcs_client.cache_clear()
            storage.settings.STORAGE_BACKEND = "gcs"
            storage._gcs_delete("users/u1/assets/img.png")

        mock_blob.delete.assert_called_once()

    def test_delete_swallows_not_found(self):
        """If the blob is already gone, _gcs_delete must not raise."""
        mock_blob = MagicMock()
        mock_blob.delete.side_effect = Exception("Not Found")
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch.dict("sys.modules", {"google.cloud.storage": MagicMock(Client=lambda: mock_client)}):
            from core_api import storage
            storage._gcs_client.cache_clear()
            # Should not raise
            storage._gcs_delete("missing/key.png")


class TestGcsSignedUrl:
    def test_v4_signed_url_uses_iam_signblob(self):
        """
        SPEC §8: V4 signed URL must use service_account_email + access_token
        (no key file).  We verify the blob.generate_signed_url call args.
        """
        mock_blob = MagicMock()
        mock_blob.generate_signed_url.return_value = "https://storage.googleapis.com/signed"
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_client_instance = MagicMock()
        mock_client_instance.bucket.return_value = mock_bucket

        mock_creds = MagicMock()
        mock_creds.token = "ya29.fake-access-token"

        mock_gcs_mod = MagicMock()
        mock_gcs_mod.Client.return_value = mock_client_instance

        with patch.dict("sys.modules", {"google.cloud.storage": mock_gcs_mod}), \
             patch("google.auth.default", return_value=(mock_creds, "project")), \
             patch("google.auth.transport.requests.Request", return_value=MagicMock()):
            from core_api import storage
            storage._gcs_client.cache_clear()
            storage.settings.STORAGE_BACKEND = "gcs"
            storage.settings.GCS_BUCKET = "test-bucket"
            storage.settings.SIGNING_SERVICE_ACCOUNT = "sa@project.iam.gserviceaccount.com"
            storage.settings.SIGNED_URL_TTL_SECONDS = 900

            url = storage._gcs_signed_url("users/u1/exports/job.png", 900)

        assert url == "https://storage.googleapis.com/signed"
        call_kwargs = mock_blob.generate_signed_url.call_args[1]
        assert call_kwargs["version"] == "v4"
        assert call_kwargs["service_account_email"] == "sa@project.iam.gserviceaccount.com"
        assert call_kwargs["access_token"] == "ya29.fake-access-token"
        assert call_kwargs["method"] == "GET"

    def test_generate_signed_url_dispatches_to_gcs(self):
        """Public generate_signed_url() dispatches to GCS when STORAGE_BACKEND=gcs."""
        from core_api import storage
        storage.settings.STORAGE_BACKEND = "gcs"
        with patch.object(storage, "_gcs_signed_url", return_value="https://gcs/url") as mock_gcs:
            result = storage.generate_signed_url("some/key.png", ttl_seconds=300)
        mock_gcs.assert_called_once_with("some/key.png", 300)
        assert result == "https://gcs/url"

    def test_generate_signed_url_dispatches_to_local(self):
        """generate_signed_url() uses JWT token when STORAGE_BACKEND=local."""
        from core_api import storage
        storage.settings.STORAGE_BACKEND = "local"
        storage.settings.JWT_SECRET = "test-secret"
        url = storage.generate_signed_url("some/key.png", ttl_seconds=900)
        assert url.startswith("/api/files/")


# =============================================================================
# Pub/Sub queue tests
# =============================================================================

class TestPubSubQueue:
    def test_publish_pubsub_calls_publisher(self):
        """QUEUE_BACKEND=pubsub must call publisher.publish with the topic and JSON payload."""
        mock_future = MagicMock()
        mock_future.result.return_value = "msg-id-123"
        mock_publisher = MagicMock()
        mock_publisher.publish.return_value = mock_future
        mock_pubsub = MagicMock()
        mock_pubsub.PublisherClient.return_value = mock_publisher

        with patch.dict("sys.modules", {"google.cloud.pubsub_v1": mock_pubsub}):
            from core_api import queue
            queue._publisher.cache_clear()
            queue.settings.QUEUE_BACKEND = "pubsub"
            queue.settings.PUBSUB_TOPIC = "projects/proj/topics/export-requests"
            queue._publish_pubsub("job-uuid-1234")

        mock_publisher.publish.assert_called_once()
        topic_arg, data_arg = mock_publisher.publish.call_args[0]
        assert topic_arg == "projects/proj/topics/export-requests"
        import json
        payload = json.loads(data_arg.decode())
        assert payload["jobId"] == "job-uuid-1234"

    def test_publish_export_job_routes_pubsub(self):
        """publish_export_job publishes directly inline when QUEUE_BACKEND=pubsub."""
        from fastapi import BackgroundTasks
        from core_api import queue
        queue.settings.QUEUE_BACKEND = "pubsub"

        bg = MagicMock(spec=BackgroundTasks)
        with patch.object(queue, "_publish_pubsub") as mock_pub:
            queue.publish_export_job("job-abc", bg)
        mock_pub.assert_called_once_with("job-abc")
        bg.add_task.assert_not_called()

    def test_publish_export_job_routes_local(self):
        """publish_export_job uses _send_local_push when QUEUE_BACKEND=local."""
        from fastapi import BackgroundTasks
        from core_api import queue
        queue.settings.QUEUE_BACKEND = "local"

        bg = MagicMock(spec=BackgroundTasks)
        with patch.object(queue, "_send_local_push") as mock_local:
            queue.publish_export_job("job-xyz", bg)
        bg.add_task.assert_called_once_with(mock_local, "job-xyz")

    def test_publish_pubsub_error_does_not_raise(self):
        """If Pub/Sub raises, publish_export_job catches it and raises 503 HTTP exception."""
        from fastapi import BackgroundTasks
        mock_pubsub = MagicMock()
        mock_pubsub.PublisherClient.side_effect = Exception("connection refused")
        with patch.dict("sys.modules", {"google.cloud.pubsub_v1": mock_pubsub}):
            from core_api import queue
            queue._publisher.cache_clear()
            queue.settings.QUEUE_BACKEND = "pubsub"
            bg = MagicMock(spec=BackgroundTasks)
            with pytest.raises(Exception) as exc_info:
                queue.publish_export_job("job-err", bg)
            assert exc_info.value.status_code == 503