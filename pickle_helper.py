import sys
import json
import pickle

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)
    
    cmd = sys.argv[1]
    filepath = sys.argv[2]
    
    if cmd == "import":
        try:
            with open(filepath, "rb") as f:
                data = pickle.load(f)
            # Ensure we send a clean JSON output
            print(json.dumps(data))
        except FileNotFoundError:
            print(json.dumps({"error": "File not found", "code": "ENOENT"}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    elif cmd == "export":
        try:
            # Read from stdin to avoid CLI argument length limit issues
            json_str = sys.stdin.read()
            data = json.loads(json_str)
            with open(filepath, "wb") as f:
                pickle.dump(data, f, protocol=4)
            print(json.dumps({"status": "ok"}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
