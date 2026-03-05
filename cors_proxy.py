"""
mIRC-Style LLM Chat Simulator - CORS Proxy Server
A simple Flask proxy to forward requests from the browser to LM Studio,
solving CORS restrictions for local development.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import sys
import os
import argparse

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Parse command-line arguments
parser = argparse.ArgumentParser(description='CORS Proxy for LM Studio')
parser.add_argument('--lm-studio', type=str, 
                    help='LM Studio URL (default: http://localhost:1234)')
parser.add_argument('--port', type=int, default=5000,
                    help='Port for CORS proxy (default: 5000)')
args, unknown = parser.parse_known_args()

# Determine LM Studio URL (priority: CLI args > env var > default)
if args.lm_studio:
    LM_STUDIO_BASE = args.lm_studio
elif os.getenv('LM_STUDIO_URL'):
    LM_STUDIO_BASE = os.getenv('LM_STUDIO_URL')
else:
    LM_STUDIO_BASE = "http://localhost:1234"

# Ensure it has the correct endpoint
if not LM_STUDIO_BASE.endswith('/v1/chat/completions'):
    LM_STUDIO_BASE = LM_STUDIO_BASE.rstrip('/') + '/v1/chat/completions'

LM_STUDIO_URL = LM_STUDIO_BASE
PROXY_PORT = args.port

@app.route('/', methods=['GET'])
def index():
    """
    Root endpoint - shows proxy status and available endpoints.
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>mIRC LLM Simulator - CORS Proxy</title>
        <style>
            body {{ font-family: monospace; background: #1e1e1e; color: #00ff00; padding: 20px; }}
            h1 {{ color: #00ffff; }}
            .status {{ padding: 10px; margin: 10px 0; background: #2d2d2d; border-left: 3px solid #00ff00; }}
            .endpoint {{ padding: 5px; margin: 5px 0; }}
            .method {{ color: #ffff00; font-weight: bold; }}
            a {{ color: #00ffff; }}
            .usage {{ padding: 10px; margin: 10px 0; background: #2d2d2d; border-left: 3px solid #ffff00; }}
            code {{ background: #000; padding: 2px 6px; border-radius: 3px; }}
        </style>
    </head>
    <body>
        <h1>mIRC LLM Simulator - CORS Proxy</h1>
        <div class="status">
            <strong>Status:</strong> ✓ Proxy is running<br>
            <strong>Port:</strong> {PROXY_PORT}<br>
            <strong>Forwarding to:</strong> {LM_STUDIO_URL}
        </div>
        <h2>Available Endpoints:</h2>
        <div class="endpoint">
            <span class="method">GET</span> <a href="/health">/health</a> - Check proxy and LM Studio status
        </div>
        <div class="endpoint">
            <span class="method">POST</span> /chat - Forward chat requests to LM Studio
        </div>
        <div class="usage">
            <strong>Command-line Options:</strong><br>
            <code>python cors_proxy.py --lm-studio http://IP:PORT</code> - Custom LM Studio URL<br>
            <code>python cors_proxy.py --port 8000</code> - Custom proxy port<br>
            <code>set LM_STUDIO_URL=http://IP:PORT</code> - Environment variable
        </div>
        <p style="margin-top: 30px;">
            <a href="/health">→ Check Health Status</a>
        </p>
    </body>
    </html>
    """

@app.route('/chat', methods=['POST'])
def chat():
    """
    Proxy endpoint for LM Studio chat completions.
    Forwards the request to LM Studio and returns the response.
    """
    try:
        print(f"[PROXY] Forwarding request to LM Studio: {LM_STUDIO_URL}")
        
        # Forward the request to LM Studio
        response = requests.post(
            LM_STUDIO_URL,
            json=request.json,
            timeout=60
        )
        
        print(f"[PROXY] LM Studio response status: {response.status_code}")
        
        # Return the LM Studio response
        return jsonify(response.json()), response.status_code
        
    except requests.exceptions.Timeout:
        print("[PROXY] ERROR: LM Studio request timed out")
        return jsonify({"error": "LM Studio request timed out"}), 504
        
    except requests.exceptions.ConnectionError:
        print("[PROXY] ERROR: Cannot connect to LM Studio")
        return jsonify({"error": "Cannot connect to LM Studio. Is it running?"}), 503
        
    except Exception as e:
        print(f"[PROXY] ERROR: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """
    Health check endpoint to verify the proxy and LM Studio are reachable.
    """
    try:
        # Try to connect to LM Studio
        response = requests.get(LM_STUDIO_URL.replace('/v1/chat/completions', '/v1/models'), timeout=5)
        
        return jsonify({
            "status": "ok",
            "proxy": "running",
            "lm_studio": LM_STUDIO_URL,
            "lm_studio_reachable": response.status_code == 200
        })
    except Exception as e:
        return jsonify({
            "status": "warning",
            "proxy": "running",
            "lm_studio": LM_STUDIO_URL,
            "lm_studio_reachable": False,
            "error": str(e)
        })


if __name__ == '__main__':
    print("=" * 60)
    print("mIRC-Style LLM Chat Simulator - CORS Proxy")
    print("=" * 60)
    print(f"Proxy running on: http://localhost:{PROXY_PORT}")
    print(f"Forwarding to LM Studio: {LM_STUDIO_URL}")
    print(f"Health check: http://localhost:{PROXY_PORT}/health")
    print("=" * 60)
    print("\nUsage examples:")
    print("  Default:        python cors_proxy.py")
    print("  Custom port:    python cors_proxy.py --port 8000")
    print("  Remote LM:      python cors_proxy.py --lm-studio http://192.168.1.100:1234")
    print("  Env var:        set LM_STUDIO_URL=http://10.5.0.2:8080 && python cors_proxy.py")
    print("=" * 60)
    print("Press CTRL+C to stop")
    print()
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=PROXY_PORT, debug=True)
