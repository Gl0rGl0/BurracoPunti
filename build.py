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

    # PyInstaller command for single standalone .exe
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--distpath", base_dir,
        "--noconfirm",
        "--onefile",
        "--windowed",
        "--name", "BurracoPunti",
        "--add-data", f"{src_dir};src",
        "--hidden-import", "clr",
        "--hidden-import", "webview",
        "--hidden-import", "webview.platforms.winforms",
        "main.py"
    ]

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
