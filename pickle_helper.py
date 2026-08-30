import sys
import json
import pickle
import types

# Define stub classes in the __main__ module to satisfy pickle loader
class DialogueFractalEngineV36:
    def __init__(self):
        self.direct_pairs = {}
        self.attractor_map = {}
        self.history = []
        self.input_fractal = None

class DialogueFractalEngine:
    def __init__(self):
        self.direct_pairs = {}
        self.attractor_map = {}
        self.history = []
        self.input_fractal = None

class FractalNode:
    def __init__(self):
        self.transitions = {}
        self.frequencies = {}

# Make sure these stub classes are accessible under mock names too if needed
for m_name in ['fractalEngine', 'dialogueEngine', 'engine']:
    if m_name not in sys.modules:
        m = types.ModuleType(m_name)
        setattr(m, 'DialogueFractalEngineV36', DialogueFractalEngineV36)
        setattr(m, 'DialogueFractalEngine', DialogueFractalEngine)
        setattr(m, 'FractalNode', FractalNode)
        sys.modules[m_name] = m

def to_dict(obj):
    """
    Recursively converts custom unpickled objects (like DialogueFractalEngine)
    into standard Python dictionaries that are JSON-serializable.
    """
    if isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    elif isinstance(obj, dict):
        return {str(k): to_dict(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [to_dict(v) for v in obj]
    elif hasattr(obj, "__dict__"):
        # This resolves custom class instances (like DialogueFractalEngineV36)
        res = {}
        for k, v in obj.__dict__.items():
            # Filter out internal/private functions or fields if necessary
            if not k.startswith('__'):
                res[k] = to_dict(v)
        return res
    else:
        try:
            # Fallback for other potential types
            return str(obj)
        except:
            return None

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
            # Recursively convert data to JSON-safe dictionary
            json_safe_data = to_dict(data)
            print(json.dumps(json_safe_data))
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
