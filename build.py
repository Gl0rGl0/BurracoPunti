import os
import sys
import subprocess
import shutil

def build():
    print("==================================================")
    print("Avvio compilazione eseguibile portatile BurracoPunti.exe")
    print("==================================================")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(base_dir, "src")

    if not os.path.exists(src_dir):
        print("Errore: Cartella 'src' non trovata!")
        sys.exit(1)

    # Clean previous builds
    for folder in ["build", "dist"]:
        path = os.path.join(base_dir, folder)
        if os.path.exists(path):
            shutil.rmtree(path, ignore_errors=True)

    # Ensure Windows multi-resolution icon.ico exists from icon.png
    ico_path = os.path.join(base_dir, "img", "icon.ico")
    png_path = os.path.join(base_dir, "img", "icon.png")
    src_img_dir = os.path.join(src_dir, "img")
    os.makedirs(src_img_dir, exist_ok=True)
    src_ico_path = os.path.join(src_img_dir, "icon.ico")
    src_png_path = os.path.join(src_img_dir, "icon.png")

    if os.path.exists(png_path):
        try:
            from PIL import Image
            img = Image.open(png_path)
            img.save(ico_path, format="ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
            shutil.copy2(ico_path, src_ico_path)
            
            # Keep web icon crisp and lightweight (256x256 instead of 4.8MB 2048x2048)
            web_icon = img.resize((256, 256), Image.Resampling.LANCZOS)
            web_icon.save(src_png_path, optimize=True)
            print(f"Icone sincronizzate ed ottimizzate con successo.")
        except Exception as e:
            print(f"Avviso generazione icon.ico/png: {e}")

    # Exclude heavy unused modules from PyInstaller bundling to keep EXE lightweight
    excluded_modules = [
        "numpy",
        "scipy",
        "cryptography",
        "PIL",
        "Pillow",
        "pygments",
        "jinja2",
        "mako",
        "psutil",
        "unittest",
        "pydoc",
        "tkinter"
    ]

    # PyInstaller command for single standalone .exe
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--distpath", base_dir,
        "--noconfirm",
        "--onefile",
        "--windowed",
        "--name", "BurracoPunti",
        "--icon", ico_path,
        "--add-data", f"{src_dir};src",
        "--add-data", f"{ico_path};img",
        "--hidden-import", "clr",
        "--hidden-import", "webview",
        "--hidden-import", "webview.platforms.winforms",
    ]

    for mod in excluded_modules:
        cmd.extend(["--exclude-module", mod])

    cmd.append("main.py")

    print(f"Esecuzione comando: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=base_dir)
    if res.returncode != 0:
        print("Errore durante la compilazione con PyInstaller!")
        sys.exit(res.returncode)

    exe_path = os.path.join(base_dir, "BurracoPunti.exe")
    if os.path.exists(exe_path):
        size_mb = os.path.getsize(exe_path) / (1024 * 1024)
        print("\n==================================================")
        print(f"SUCCESS! Eseguibile generato con successo:")
        print(f"Percorso: {exe_path}")
        print(f"Dimensione: {size_mb:.2f} MB")
        print("==================================================")
        
        # # Move copy BurracoPunti.exe to root of workspace for immediate ease of use
        # root_exe = os.path.join(base_dir, "BurracoPunti.exe")
        # try:
        #     shutil.move(exe_path, root_exe)
        #     print(f"Spostato nella cartella principale: {root_exe}")
        # except Exception as e:
        #     print(f"Avviso spostamento: {e}")

if __name__ == "__main__":
    build()
