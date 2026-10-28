import os
import sys
import re
import json
import base64
import shutil
import threading
import time
import webview

def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

def get_app_dir():
    """ Get directory where the executable or main.py lives """
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_config_value(key, default=""):
    """ Read a configuration string by key from src/js/config.js """
    try:
        config_path = get_resource_path(os.path.join("src", "js", "config.js"))
        if not os.path.exists(config_path):
            config_path = get_resource_path(os.path.join("js", "config.js"))
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                content = f.read()
            match = re.search(rf'{key}\s*:\s*["\']([^"\']+)["\']', content)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Errore lettura {key} da config.js: {e}")
    return default

def get_save_folder_name():
    """ Read target save folder from config.js with fallback to BurracoPunti """
    folder = get_config_value("directoryName")
    if not folder:
        folder = get_config_value("saveDirectory", "BurracoPunti")
    return folder

def get_stats_filename():
    """ Read stats filename from config.js with fallback to statistiche_tornei.json """
    return get_config_value("statsFileName", "statistiche_tornei.json")

_DOCS_DIR_CACHE = None

def get_user_documents_dir():
    """ Get path to user's Documents folder (e.g. C:\\Users\\[UTENTE]\\Documents) """
    global _DOCS_DIR_CACHE
    if _DOCS_DIR_CACHE:
        return _DOCS_DIR_CACHE

    docs = None
    try:
        import ctypes.wintypes
        CSIDL_PERSONAL = 5  # My Documents
        SHGFP_TYPE_CURRENT = 0
        buf = ctypes.create_unicode_buffer(ctypes.wintypes.MAX_PATH)
        ctypes.windll.shell32.SHGetFolderPathW(None, CSIDL_PERSONAL, None, SHGFP_TYPE_CURRENT, buf)
        if buf.value and os.path.exists(buf.value):
            docs = buf.value
    except Exception:
        pass
    
    # Fallback to standard USERPROFILE / ~ Documents
    if not docs:
        user_home = os.environ.get('USERPROFILE') or os.path.expanduser('~')
        docs = os.path.join(user_home, "Documents")

    _DOCS_DIR_CACHE = docs
    return docs

def get_save_dir():
    """ Get and ensure C:\\Users\\[UTENTE]\\Documents\\[directoryName] exists """
    folder_name = get_save_folder_name()
    save_dir = os.path.join(get_user_documents_dir(), folder_name)
    os.makedirs(save_dir, exist_ok=True)
    return save_dir

def get_app_title():
    return get_config_value("appTitle", "Burraco - Gestione Torneo")

def get_app_icon():
    """ Find icon file (.ico or .png) in img or src/img """
    for rel in [
        os.path.join("img", "icon.ico"),
        os.path.join("src", "img", "icon.ico"),
        os.path.join("img", "icon.png"),
        os.path.join("src", "img", "icon.png"),
    ]:
        p = get_resource_path(rel)
        if os.path.exists(p):
            return p
    return None

class BurracoApi:
    def __init__(self):
        self.save_dir = get_save_dir()
        self.filename = get_stats_filename()
        self.save_path = os.path.join(self.save_dir, self.filename)

    def save_tournament_data(self, json_data):
        """ Auto-save tournament state to local JSON file in user Documents directory """
        try:
            try:
                data = json.loads(json_data)
                if isinstance(data, dict) and "config" in data and isinstance(data["config"], dict):
                    custom_dir = data["config"].get("directoryName")
                    if custom_dir and isinstance(custom_dir, str) and custom_dir.strip():
                        new_save_dir = os.path.join(get_user_documents_dir(), custom_dir.strip())
                        if new_save_dir != self.save_dir:
                            self.save_dir = new_save_dir
                            self.save_path = os.path.join(self.save_dir, self.filename)
                    new_title = data["config"].get("appTitle")
                    if new_title and webview.windows:
                        try:
                            webview.windows[0].set_title(new_title)
                        except Exception:
                            pass
            except Exception:
                pass

            os.makedirs(self.save_dir, exist_ok=True)
            with open(self.save_path, "w", encoding="utf-8") as f:
                f.write(json_data)
            return {"success": True, "path": self.save_path}
        except Exception as e:
            print(f"Error saving tournament data: {e}")
            return {"success": False, "error": str(e)}

    def load_tournament_data(self):
        """ Read saved tournament from Documents or start clean without test data """
        if os.path.exists(self.save_path):
            try:
                with open(self.save_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading tournament data: {e}")

        # In Desktop/EXE mode, if no saved tournament exists on disk,
        # return a clean tournament structure with NO test data!
        default_title = get_config_value("appTitle", "Burraco Punti")
        return {
            "title": default_title,
            "pairs": []
        }

    def export_excel_native(self, default_filename, base64_content):
        """ Save Excel file using Windows native Save File Dialog """
        try:
            binary_data = base64.b64decode(base64_content)
            
            # If window is available, open native Save File Dialog
            save_path = None
            window = webview.windows[0] if webview.windows else None
            if window:
                result = window.create_file_dialog(
                    webview.FileDialog.SAVE,
                    directory=self.save_dir,
                    save_filename=default_filename,
                    file_types=('File Excel (*.xlsx)', 'Tutti i file (*.*)')
                )
                if result:
                    # On Windows, result can be a tuple or string
                    save_path = result[0] if isinstance(result, (list, tuple)) else result
            
            # Fallback if dialog cancelled or not supported
            if not save_path:
                save_path = os.path.join(self.save_dir, default_filename)

            with open(save_path, "wb") as f:
                f.write(binary_data)

            return {"success": True, "path": save_path}
        except Exception as e:
            print(f"Error exporting Excel: {e}")
            return {"success": False, "error": str(e)}

    def save_tournament_data_as(self, default_filename, json_data):
        """ Save tournament JSON to user-chosen location using native Windows Save File Dialog """
        try:
            window = webview.windows[0] if webview.windows else None
            save_path = None
            if window:
                result = window.create_file_dialog(
                    webview.FileDialog.SAVE,
                    directory=self.save_dir,
                    save_filename=default_filename,
                    file_types=('File JSON (*.json)', 'Tutti i file (*.*)')
                )
                if result:
                    save_path = result[0] if isinstance(result, (list, tuple)) else result

            if not save_path:
                return {"success": False, "cancelled": True}

            with open(save_path, "w", encoding="utf-8") as f:
                f.write(json_data)

            return {"success": True, "path": save_path}
        except Exception as e:
            print(f"Error saving tournament data as: {e}")
            return {"success": False, "error": str(e)}

def get_app_version():
    return get_config_value("version", "1.4.3")

def get_remote_url():
    return get_config_value("remoteUrl", "https://burracopunti.giust.workers.dev/")

def parse_version_tuple(v_str):
    try:
        return [int(x) for x in re.findall(r'\d+', str(v_str))]
    except Exception:
        return [0]

def is_newer_version(remote_v, local_v):
    return parse_version_tuple(remote_v) > parse_version_tuple(local_v)

def is_newer_or_equal(v1, v2):
    return parse_version_tuple(v1) >= parse_version_tuple(v2)

def get_live_app_dir():
    """ Directory in user LocalAppData where updated web assets are cached """
    local_app_data = os.environ.get('LOCALAPPDATA')
    if not local_app_data:
        local_app_data = os.path.join(os.path.expanduser('~'), 'AppData', 'Local')
    folder = get_save_folder_name()
    path = os.path.join(local_app_data, folder, "live_web")
    os.makedirs(path, exist_ok=True)
    return path

def get_active_html_path():
    """ Returns the path to the best available index.html (live cache or bundled fallback) """
    bundled_html = get_resource_path(os.path.join("src", "index.html"))
    if not os.path.exists(bundled_html):
        bundled_html = get_resource_path("index.html")

    bundled_version = get_app_version()

    live_dir = get_live_app_dir()
    live_html = os.path.join(live_dir, "index.html")
    live_config = os.path.join(live_dir, "js", "config.js")

    if os.path.exists(live_html) and os.path.exists(live_config):
        try:
            with open(live_config, "r", encoding="utf-8") as f:
                content = f.read()
            match = re.search(r'version\s*:\s*["\']([^"\']+)["\']', content)
            live_version = match.group(1) if match else "0.0.0"
            if is_newer_or_equal(live_version, bundled_version):
                return live_html, live_version
        except Exception:
            pass
    return bundled_html, bundled_version

ASSETS_TO_DOWNLOAD = [
    'index.html',
    'manifest.json',
    'styles.css',
    'xlsx.full.min.js',
    'app.js',
    'js/config.js',
    'js/utils.js',
    'js/engine.js',
    'js/storage.js',
    'js/excel.js',
    'css/base.css',
    'css/tables.css',
    'css/podium.css',
    'css/modals.css',
    'css/print.css',
    'img/icon.png',
    'img/pwa-192x192.png',
    'img/pwa-512x512.png',
    'img/pwa-maskable-512x512.png'
]

def check_for_background_updates(window, current_version):
    """
    Runs in background thread:
    1. Checks if Cloudflare has a newer version without blocking app startup.
    2. Downloads assets into staging folder.
    3. Atomically promotes staging to live_web.
    4. Notifies frontend UI so user can reload when ready.
    """
    time.sleep(2.5)  # Let startup finish completely first
    remote_url = get_remote_url()
    if not remote_url:
        return

    try:
        import urllib.request
        base_url = remote_url.rstrip('/')
        manifest_url = f"{base_url}/manifest.json"
        
        req = urllib.request.Request(manifest_url, headers={'User-Agent': f'BurracoDesktop/{current_version}'})
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            if resp.status != 200:
                return
            manifest_data = json.loads(resp.read().decode('utf-8'))
            remote_version = manifest_data.get('version')

        if not remote_version or not is_newer_version(remote_version, current_version):
            return

        print(f"Info: Rilevata nuova versione v{remote_version} su Cloudflare (attuale: v{current_version}). Download in background...")

        live_dir = get_live_app_dir()
        staging_dir = os.path.join(os.path.dirname(live_dir), "staging_web")
        if os.path.exists(staging_dir):
            shutil.rmtree(staging_dir, ignore_errors=True)
        os.makedirs(staging_dir, exist_ok=True)

        for rel_path in ASSETS_TO_DOWNLOAD:
            asset_url = f"{base_url}/{rel_path}"
            target_path = os.path.join(staging_dir, rel_path.replace('/', os.sep))
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            
            try:
                asset_req = urllib.request.Request(asset_url, headers={'User-Agent': f'BurracoDesktop/{current_version}'})
                with urllib.request.urlopen(asset_req, timeout=4.0) as a_resp:
                    if a_resp.status == 200:
                        with open(target_path, "wb") as out_f:
                            out_f.write(a_resp.read())
            except Exception as e:
                print(f"Avviso download {rel_path}: {e}")

        staging_index = os.path.join(staging_dir, "index.html")
        if os.path.exists(staging_index) and os.path.getsize(staging_index) > 500:
            for root, dirs, files in os.walk(staging_dir):
                rel_root = os.path.relpath(root, staging_dir)
                dest_root = os.path.join(live_dir, rel_root)
                os.makedirs(dest_root, exist_ok=True)
                for f in files:
                    src_f = os.path.join(root, f)
                    dest_f = os.path.join(dest_root, f)
                    shutil.copy2(src_f, dest_f)

            shutil.rmtree(staging_dir, ignore_errors=True)
            print(f"SUCCESS: Aggiornamento v{remote_version} pronto nella cache locale.")

            # Inform UI
            js_call = f"if (window.onAppUpdateAvailable) {{ window.onAppUpdateAvailable('{remote_version}'); }}"
            try:
                window.evaluate_js(js_call)
            except Exception:
                pass
    except Exception as e:
        print(f"Info: Controllo aggiornamenti background completato ({e})")

def is_remote_available(url, timeout=2.0):
    """ Verifica se Cloudflare Workers è raggiungibile """
    if not url:
        return False
    try:
        import urllib.request
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'BurracoDesktop/1.4.3'}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception:
        return False

def setup_windows_taskbar_icon(app_id="burracopunti.tournamentmanager.1.4.3"):
    """
    On Windows, explicit AppUserModelID is required so that the taskbar groups
    the window under this application identity rather than the generic python.exe interpreter,
    allowing the custom window icon to be displayed on the Windows Taskbar.
    """
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(app_id)
    except Exception:
        pass

def main():
    html_path, active_version = get_active_html_path()
    setup_windows_taskbar_icon(f"burracopunti.tournamentmanager.{active_version}")
    api = BurracoApi()
    app_title = get_app_title()

    from pathlib import Path
    file_uri = Path(html_path).resolve().as_uri()

    # Se esplicitamente richiesta la modalità remota con --remote
    if "--remote" in sys.argv:
        remote_url = get_remote_url()
        if remote_url and is_remote_available(remote_url, timeout=2.0):
            print(f"Burraco Desktop v{active_version}: Avvio da Cloudflare ({remote_url}).")
            app_url = remote_url
        else:
            print(f"Burraco Desktop v{active_version}: Connessione remota non disponibile. Avvio da file locali.")
            app_url = file_uri
    else:
        app_url = file_uri

    window = webview.create_window(
        title=app_title,
        url=app_url,
        js_api=api,
        width=1280,
        height=820,
        min_size=(980, 640),
        background_color='#0F172A',
        text_select=True
    )

    # Avvia controllo e download aggiornamenti in background senza bloccare la UI
    threading.Thread(
        target=check_for_background_updates,
        args=(window, active_version),
        daemon=True
    ).start()

    app_icon = get_app_icon()
    webview.start(debug=False, icon=app_icon, private_mode=False)

if __name__ == "__main__":
    main()
