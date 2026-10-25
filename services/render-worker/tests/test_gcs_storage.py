"""
Mock-based unit tests for the GCS storage backend in render-worker.
Never touches real GCP services.
"""

import os
from unittest.mock import MagicMock, patch

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("STORAGE_BACKEND", "gcs")
os.environ.setdefault("GCS_BUCKET", "test-bucket")

import pytest


class TestWorkerGcsSave:
    def test_save_uploads_bytes(self):
        mock_blob = MagicMock()
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch.dict("sys.modules", {"google.cloud.storage": MagicMock(Client=lambda: mock_client)}):
            from worker import storage
            storage.settings.STORAGE_BACKEND = "gcs"
            storage.settings.GCS_BUCKET = "test-bucket"

            key = storage._gcs_save("users/u/exports/job.png", b"pngbytes")

        mock_bucket.blob.assert_called_once_with("users/u/exports/job.png")
        mock_blob.upload_from_string.assert_called_once_with(b"pngbytes")
        assert key == "users/u/exports/job.png"


class TestWorkerGcsRead:
    def test_read_returns_bytes(self):
        mock_blob = MagicMock()
        mock_blob.download_as_bytes.return_value = b"imagedata"
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch.dict("sys.modules", {"google.cloud.storage": MagicMock(Client=lambda: mock_client)}):
            from worker import storage
            storage.settings.STORAGE_BACKEND = "gcs"
            storage.settings.GCS_BUCKET = "test-bucket"

            data = storage._gcs_read("users/u/assets/img.png")

        assert data == b"imagedata"

    def test_read_dispatch_gcs(self):
        from worker import storage
        storage.settings.STORAGE_BACKEND = "gcs"
        with patch.object(storage, "_gcs_read", return_value=b"x") as m:
            result = storage.read_file("some/key")
        m.assert_called_once_with("some/key")
        assert result == b"x"

    def test_read_dispatch_local(self, tmp_path):
        from worker import storage
        storage.settings.STORAGE_BACKEND = "local"
        storage.settings.LOCAL_STORAGE_DIR = str(tmp_path)
        (tmp_path / "test.bin").write_bytes(b"localdata")
        data = storage.read_file("test.bin")
        assert data == b"localdata"


class TestWorkerGcsExists:
    def test_exists_true(self):
        mock_blob = MagicMock()
        mock_blob.exists.return_value = True
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch.dict("sys.modules", {"google.cloud.storage": MagicMock(Client=lambda: mock_client)}):
            from worker import storage
            storage.settings.STORAGE_BACKEND = "gcs"
            result = storage._gcs_exists("users/u/assets/img.png")

        assert result is True

    def test_exists_false(self):
        mock_blob = MagicMock()
        mock_blob.exists.return_value = False
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob
        mock_client = MagicMock()
        mock_client.bucket.return_value = mock_bucket

        with patch.dict("sys.modules", {"google.cloud.storage": MagicMock(Client=lambda: mock_client)}):
            from worker import storage
            storage.settings.STORAGE_BACKEND = "gcs"
            result = storage._gcs_exists("nonexistent/key.png")

        assert result is False

    def test_exists_dispatch(self):
        from worker import storage
        storage.settings.STORAGE_BACKEND = "gcs"
        with patch.object(storage, "_gcs_exists", return_value=True) as m:
            result = storage.file_exists("some/key")
        m.assert_called_once_with("some/key")
        assert result is True
