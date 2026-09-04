import os
import sys
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

class BurracoApi:
    def __init__(self):
        self.save_path = os.path.join(get_app_dir(), "statistiche_tornei.json")

    def save_tournament_data(self, json_data):
        """ Auto-save tournament state to local JSON file """
        try:
            with open(self.save_path, "w", encoding="utf-8") as f:
                f.write(json_data)
            return {"success": True, "path": self.save_path}
        except Exception as e:
            print(f"Error saving tournament data: {e}")
            return {"success": False, "error": str(e)}

    def load_tournament_data(self):
        """ Read saved tournament from local file if exists """
        if os.path.exists(self.save_path):
            try:
                with open(self.save_path, "r", encoding="utf-8") as f:
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
                    directory=get_app_dir(),
                    save_filename=default_filename,
                    file_types=('File Excel (*.xlsx)', 'Tutti i file (*.*)')
                )
                if result:
                    # On Windows, result can be a tuple or string
                    save_path = result[0] if isinstance(result, (list, tuple)) else result
            
            # Fallback if dialog cancelled or not supported
            if not save_path:
                save_path = os.path.join(get_app_dir(), default_filename)

            with open(save_path, "wb") as f:
                f.write(binary_data)

            return {"success": True, "path": save_path}
        except Exception as e:
            print(f"Error exporting Excel: {e}")
            return {"success": False, "error": str(e)}

import re

def get_app_title():
    default_title = "Burraco - Gestione Torneo"
    try:
        config_path = get_resource_path(os.path.join("src", "js", "config.js"))
        if not os.path.exists(config_path):
            config_path = get_resource_path(os.path.join("js", "config.js"))
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                content = f.read()
            match = re.search(r'appTitle\s*:\s*["\']([^"\']+)["\']', content)
            if match:
                return match.group(1)
    except Exception as e:
        print(f"Errore lettura appTitle da config.js: {e}")
    return default_title

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
