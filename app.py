# https://pywebview.flowrl.com/guide/
import webview

class API:
    """Backend API for the application"""
    
    def __init__(self):
        pass
    
    def test_function(self):
        """Test function to verify API connection"""
        return "Hello from Python backend!"


def create_window():
    """Create and configure the main application window"""
    api = API()
    
    # Create window with HTML file
    window = webview.create_window(
        title='Document Privacy Tool',
        url='ui/index.html',
        js_api=api,
        width=1000,
        height=700,
        resizable=False
    )
    
    return window


if __name__ == '__main__':
    window = create_window()
    webview.start(debug=True)

