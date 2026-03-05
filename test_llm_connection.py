"""
Test LLM Connection - mIRC LLM Simulator
Quick test script to verify LM Studio and CORS proxy are working
"""

import requests
import json

def test_lm_studio_direct():
    """Test direct connection to LM Studio"""
    print("\n" + "="*60)
    print("TEST 1: Direct LM Studio Connection")
    print("="*60)
    
    try:
        # Test models endpoint
        response = requests.get("http://localhost:1234/v1/models", timeout=5)
        
        if response.status_code == 200:
            print("✓ LM Studio is running on port 1234")
            models = response.json()
            if 'data' in models and len(models['data']) > 0:
                print(f"✓ Loaded model: {models['data'][0].get('id', 'Unknown')}")
            return True
        else:
            print(f"✗ LM Studio responded with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to LM Studio on port 1234")
        print("  → Make sure LM Studio is running")
        print("  → Check that the local server is started in LM Studio")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_proxy_health():
    """Test CORS proxy health endpoint"""
    print("\n" + "="*60)
    print("TEST 2: CORS Proxy Health Check")
    print("="*60)
    
    try:
        response = requests.get("http://localhost:5000/health", timeout=5)
        
        if response.status_code == 200:
            print("✓ CORS Proxy is running on port 5000")
            health = response.json()
            print(f"  Status: {health.get('status', 'unknown')}")
            print(f"  LM Studio reachable: {health.get('lm_studio_reachable', False)}")
            return health.get('lm_studio_reachable', False)
        else:
            print(f"✗ Proxy responded with status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to CORS proxy on port 5000")
        print("  → Make sure cors_proxy.py is running")
        print("  → Run: python cors_proxy.py")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_chat_completion():
    """Test a simple chat completion through the proxy"""
    print("\n" + "="*60)
    print("TEST 3: Chat Completion (via Proxy)")
    print("="*60)
    
    try:
        payload = {
            "model": "local-model",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant. Respond in 10 words or less."},
                {"role": "user", "content": "Say hello in a friendly way"}
            ],
            "temperature": 0.7,
            "max_tokens": 50
        }
        
        print("Sending test message to LLM...")
        response = requests.post(
            "http://localhost:5000/chat",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                message = result['choices'][0].get('message', {}).get('content', '')
                print(f"✓ LLM Response: {message}")
                return True
            else:
                print("✗ Unexpected response format")
                print(f"  Response: {result}")
                return False
        else:
            print(f"✗ Request failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("✗ Request timed out (30 seconds)")
        print("  → LLM might be processing, try again or check LM Studio")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("mIRC LLM Simulator - Connection Test")
    print("="*60)
    print("\nThis will test:")
    print("  1. Direct LM Studio connection (port 1234)")
    print("  2. CORS Proxy connection (port 5000)")
    print("  3. End-to-end chat completion")
    print("\nMake sure both LM Studio and cors_proxy.py are running!")
    
    # Run tests
    lm_studio_ok = test_lm_studio_direct()
    proxy_ok = test_proxy_health()
    
    if lm_studio_ok and proxy_ok:
        chat_ok = test_chat_completion()
    else:
        print("\n⚠ Skipping chat test due to connection issues")
        chat_ok = False
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"LM Studio:        {'✓ PASS' if lm_studio_ok else '✗ FAIL'}")
    print(f"CORS Proxy:       {'✓ PASS' if proxy_ok else '✗ FAIL'}")
    print(f"Chat Completion:  {'✓ PASS' if chat_ok else '✗ FAIL'}")
    print("="*60)
    
    if lm_studio_ok and proxy_ok and chat_ok:
        print("\n🎉 All tests passed! LLM integration is ready!")
        print("   You can now connect to http://localhost:5000 in the app")
    else:
        print("\n⚠ Some tests failed. Check the errors above.")
        print("\nTroubleshooting:")
        if not lm_studio_ok:
            print("  • Start LM Studio and load a model")
            print("  • Go to 'Local Server' tab and click 'Start Server'")
            print("  • Make sure it's running on port 1234")
        if not proxy_ok:
            print("  • Run: python cors_proxy.py")
            print("  • Make sure port 5000 is not in use")
    
    print()


if __name__ == '__main__':
    main()
