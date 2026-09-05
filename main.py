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
        """ Read saved tournament from Documents or migrate from legacy app directory """
        target_path = self.save_path
        if not os.path.exists(target_path):
            # Fallback/migration from legacy app directory if present
            legacy_path = os.path.join(get_app_dir(), self.filename)
            if os.path.exists(legacy_path):
                try:
                    with open(legacy_path, "r", encoding="utf-8") as f_leg:
                        legacy_data = json.load(f_leg)
                    # Automatically migrate legacy data into the new Documents location
                    with open(self.save_path, "w", encoding="utf-8") as f_new:
                        json.dump(legacy_data, f_new, indent=2, ensure_ascii=False)
                    print(f"Migrated {self.filename} from {legacy_path} to {self.save_path}")
                    return legacy_data
                except Exception as e_migrate:
                    print(f"Error migrating legacy data: {e_migrate}")

        if os.path.exists(target_path):
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading tournament data: {e}")
        return None

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

def main():
    api = BurracoApi()
    
    html_path = get_resource_path(os.path.join("src", "index.html"))
    if not os.path.exists(html_path):
        # Fallback if src is flat in the bundled dir
        html_path = get_resource_path("index.html")

    app_title = get_app_title()

    window = webview.create_window(
        title=app_title,
        url=html_path,
        js_api=api,
        width=1280,
        height=820,
        min_size=(980, 640),
        background_color='#0F172A',
        text_select=True
    )
    webview.start(debug=False)

if __name__ == "__main__":
    main()
