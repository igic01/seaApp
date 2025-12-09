import webview

if __name__ == "__main__":
    webview.create_window(  "Screenshot App (DEV)",
                            "http://127.0.0.1:5173",
                            width=900,
                            height=600)
    webview.start()