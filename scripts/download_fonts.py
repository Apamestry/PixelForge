#!/usr/bin/env python3
import os
import urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SHARED_FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shared", "fonts")
os.makedirs(SHARED_FONTS_DIR, exist_ok=True)

# 1. Poppins & Lato (static available)
STATIC_DOWNLOADS = [
    ("Poppins-400.ttf", "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf"),
    ("Poppins-700.ttf", "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf"),
    ("Lato-400.ttf", "https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf"),
    ("Lato-700.ttf", "https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Bold.ttf"),
]

# 2. Variable fonts to instantiate weights 400 and 700
VARIABLE_DOWNLOADS = [
    ("Roboto", "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto%5Bwdth%2Cwght%5D.ttf", {"wdth": 100}),
    ("Montserrat", "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf", {}),
    ("PlayfairDisplay", "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf", {}),
    ("Oswald", "https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald%5Bwght%5D.ttf", {}),
]

def download_file(url, dest):
    print(f"Downloading {url} -> {dest}")
    urllib.request.urlretrieve(url, dest)

def main():
    # Process static
    for fname, url in STATIC_DOWNLOADS:
        dest = os.path.join(SHARED_FONTS_DIR, fname)
        if not os.path.exists(dest) or os.path.getsize(dest) == 0:
            download_file(url, dest)
        print(f"Ready: {dest} ({os.path.getsize(dest)} bytes)")

    # Process variable
    for family_prefix, url, extra_axes in VARIABLE_DOWNLOADS:
        temp_var = os.path.join(SHARED_FONTS_DIR, f"temp_{family_prefix}_var.ttf")
        download_file(url, temp_var)
        var_font = TTFont(temp_var)

        for weight in [400, 700]:
            target_path = os.path.join(SHARED_FONTS_DIR, f"{family_prefix}-{weight}.ttf")
            axes = {"wght": weight}
            axes.update(extra_axes)
            print(f"Instantiating {family_prefix} at {axes} -> {target_path}")
            instance = instancer.instantiateVariableFont(var_font, axes)
            instance.save(target_path)
            print(f"Generated: {target_path} ({os.path.getsize(target_path)} bytes)")

        if os.path.exists(temp_var):
            os.remove(temp_var)

    print("All fonts downloaded and instantiated successfully!")

if __name__ == "__main__":
    main()
