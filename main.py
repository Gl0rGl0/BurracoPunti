import os
import sys
import re
import json
import base64
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
    """ Read target save folder from config.js with fallback to BurracoPezzo """
    folder = get_config_value("directoryName")
    if not folder:
        folder = get_config_value("saveDirectory", "BurracoPezzo")
    return folder

def get_stats_filename():
    """ Read stats filename from config.js with fallback to statistiche_tornei.json """
    return get_config_value("statsFileName", "statistiche_tornei.json")

def get_user_documents_dir():
    """ Get path to user's Documents folder (e.g. C:\\Users\\[UTENTE]\\Documents) """
    try:
        import ctypes.wintypes
        CSIDL_PERSONAL = 5  # My Documents
        SHGFP_TYPE_CURRENT = 0
        buf = ctypes.create_unicode_buffer(ctypes.wintypes.MAX_PATH)
        ctypes.windll.shell32.SHGetFolderPathW(None, CSIDL_PERSONAL, None, SHGFP_TYPE_CURRENT, buf)
        if buf.value and os.path.exists(buf.value):
            return buf.value
    except Exception:
        pass
    
    # Fallback to standard USERPROFILE / ~ Documents
    user_home = os.environ.get('USERPROFILE') or os.path.expanduser('~')
    docs = os.path.join(user_home, "Documents")
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
        default_title = get_config_value("defaultTournamentTitle", "Burraco Pezzo")
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
                    webview.SAVE_DIALOG,
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

def get_app_version():
    return get_config_value("version", "1.1.0")

def get_remote_url():
    return get_config_value("remoteUrl", "https://burracopunti.giust.workers.dev/")

def is_remote_available(url, timeout=2.0):
    """ Verifica se Cloudflare Workers è raggiungibile per auto-aggiornamento da remoto """
    if not url:
        return False
    try:
        import urllib.request
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'BurracoDesktop/1.1'}
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"Info: Connessione remota non attiva ({e}). Caricamento versione locale.")
        return False

def setup_windows_taskbar_icon(app_id="burracopezzo.burracopunti.tournamentmanager.1.1.0"):
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
    version = get_app_version()
    setup_windows_taskbar_icon(f"burracopezzo.burracopunti.tournamentmanager.{version}")
    api = BurracoApi()
    
    html_path = get_resource_path(os.path.join("src", "index.html"))
    if not os.path.exists(html_path):
        # Fallback if src is flat in the bundled dir
        html_path = get_resource_path("index.html")

    app_title = get_app_title()
    remote_url = get_remote_url()

    # Se c'è connessione internet, carica da Cloudflare per ricevere gli aggiornamenti live.
    # Altrimenti, fa fallback istantaneo sui file locali del PC.
    if remote_url and is_remote_available(remote_url, timeout=2.0):
        print(f"Burraco Desktop v{version}: Avvio da Cloudflare ({remote_url}) con persistenza locale attiva.")
        app_url = remote_url
    else:
        print(f"Burraco Desktop v{version}: Avvio offline da file locali ({html_path}).")
        app_url = html_path

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

    app_icon = get_app_icon()
    webview.start(debug=False, icon=app_icon)

if __name__ == "__main__":
    main()
