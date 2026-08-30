import sys
import json
import pickle
import types

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
        res = {}
        for k, v in obj.__dict__.items():
            if not k.startswith('__'):
                res[k] = to_dict(v)
        return res
    else:
        try:
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
                # Use our CustomUnpickler to dynamically resolve and bypass any missing class versions
                unpickler = CustomUnpickler(f)
                data = unpickler.load()
            
            json_safe_data = to_dict(data)
            print(json.dumps(json_safe_data))
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
