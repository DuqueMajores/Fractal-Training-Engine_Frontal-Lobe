import sys
import json
import pickle
import types
import io

# Force UTF-8 encoding for standard input, output, and error streams
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

# Generic class fallback
class GenericStub:
    def __init__(self, *args, **kwargs):
        pass

class CustomUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        # 1. Create module dynamically if missing from sys.modules
        if module not in sys.modules:
            sys.modules[module] = types.ModuleType(module)
        
        mod = sys.modules[module]
        main_mod = sys.modules.get('__main__')

        # 2. If the class doesn't exist in the requested module, create it dynamically
        if not hasattr(mod, name):
            new_class = type(name, (object,), {
                "__init__": lambda self, *args, **kwargs: None
            })
            setattr(mod, name, new_class)
            if main_mod and not hasattr(main_mod, name):
                setattr(main_mod, name, new_class)

        # 3. If the class doesn't exist in __main__, create it there too
        if main_mod and not hasattr(main_mod, name):
            new_class = type(name, (object,), {
                "__init__": lambda self, *args, **kwargs: None
            })
            setattr(main_mod, name, new_class)

        try:
            # Attempt normal resolution
            return super().find_class(module, name)
        except Exception:
            # Absolute fallback to dynamic class
            return getattr(mod, name, getattr(main_mod, name, GenericStub))

def fix_mojibake(s):
    """
    Recursively repairs double-encoded or triple-encoded Portuguese strings (e.g. "vocÃƒÂª" -> "você")
    caused by Windows ANSI / ISO-8859-1 conversion issues.
    """
    if not isinstance(s, str):
        return s
    
    current = s
    for _ in range(5):  # Prevent infinite recursion loop
        try:
            if any(c in current for c in "ÃÂªº" or "Ãƒ" in current):
                candidate = current.encode('latin-1').decode('utf-8')
                if candidate != current:
                    current = candidate
                    continue
        except Exception:
            pass
        
        try:
            if any(c in current for c in "ÃÂªº"):
                candidate = current.encode('cp1252').decode('utf-8')
                if candidate != current:
                    current = candidate
                    continue
        except Exception:
            pass
            
        break
    return current

def to_dict(obj):
    """
    Recursively converts custom unpickled objects (like DialogueFractalEngine)
    into standard Python dictionaries that are JSON-serializable, repairing any
    mojibake characters in keys and values.
    """
    if isinstance(obj, (str, int, float, bool, type(None))):
        return fix_mojibake(obj) if isinstance(obj, str) else obj
    elif isinstance(obj, dict):
        return {fix_mojibake(str(k)) if isinstance(k, str) else str(k): to_dict(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [to_dict(v) for v in obj]
    elif hasattr(obj, "__dict__"):
        res = {}
        for k, v in obj.__dict__.items():
            if not k.startswith('__'):
                res[fix_mojibake(k)] = to_dict(v)
        return res
    else:
        try:
            val = str(obj)
            return fix_mojibake(val)
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
                # Use our CustomUnpickler to dynamically resolve and bypass any missing class versions
                unpickler = CustomUnpickler(f)
                data = unpickler.load()
            
            json_safe_data = to_dict(data)
            # Ensure output is printed using ensure_ascii=False to retain literal UTF-8 Portuguese characters
            print(json.dumps(json_safe_data, ensure_ascii=False))
        except FileNotFoundError:
            print(json.dumps({"error": "File not found", "code": "ENOENT"}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    elif cmd == "export":
        try:
            json_str = sys.stdin.read()
            data = json.loads(json_str)
            with open(filepath, "wb") as f:
                pickle.dump(data, f, protocol=4)
            print(json.dumps({"status": "ok"}))
        except Exception as e:
            print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
