# collect_config_script.py
# This script collects project directory structure and contents of ALL relevant files.

import os
import sys

# --- Configuration ---
# Set your project's root directory. This should be where your docker-compose.yml is.
PROJECT_ROOT = "/opt/docker/dev/homeorg"
OUTPUT_FILENAME = "project_state_report_full.txt" # Changed filename to indicate full report

# Directories to exclude from scanning
EXCLUDE_DIRS = [
    ".git",
    "__pycache__",
    "venv", # Exclude the virtual environment directory
    "node_modules",
    "data", # Exclude the data directory (contains .db files)
    "build",
    "dist",
    ".mypy_cache",
    ".pytest_cache",
]

# File extensions to include (common text-based files)
INCLUDE_EXTENSIONS = (
    '.py', '.yml', '.yaml', '.json', '.html', '.css', '.js', '.txt',
    '.md', '.env', '.dockerignore', 'Dockerfile' # Dockerfile has no extension
)

# --- Helper Functions ---

def get_directory_structure(startpath):
    """Generates a string representation of the directory tree."""
    structure = "--- Directory Structure ---\n"
    for root, dirs, files in os.walk(startpath):
        # Modify dirs in-place to skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        structure += f'{indent}{os.path.basename(root)}/\n'
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            structure += f'{subindent}{f}\n'
    return structure

def get_file_content(filepath):
    """Reads and returns the content of a file, handling encoding errors."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        return f"[FILE CONTENT NOT SHOWN: Binary or non-UTF-8 encoded file at {filepath}]"
    except FileNotFoundError:
        return f"[FILE NOT FOUND: {filepath}]"
    except Exception as e:
        return f"[ERROR READING FILE {filepath}: {e}]"

# --- Main Script Logic ---

def collect_project_state():
    """Collects and writes project state to an output file."""
    output_path = os.path.join(PROJECT_ROOT, OUTPUT_FILENAME)

    if not os.path.isdir(PROJECT_ROOT):
        print(f"Error: Project root directory '{PROJECT_ROOT}' not found.", file=sys.stderr)
        print("Please ensure PROJECT_ROOT in the script is set correctly.", file=sys.stderr)
        return

    print(f"Collecting project state from: {PROJECT_ROOT}")
    print(f"Output will be saved to: {output_path}")

    with open(output_path, 'w', encoding='utf-8') as outfile:
        outfile.write(f"--- Full Project State Report for {PROJECT_ROOT} ---\n")
        outfile.write(f"Generated on: {os.path.getctime(output_path) if os.path.exists(output_path) else 'N/A'}\n\n")

        # Write Directory Structure
        print("Collecting directory structure...")
        outfile.write(get_directory_structure(PROJECT_ROOT))
        outfile.write("\n\n")

        # Write File Contents
        print("Collecting file contents...")
        collected_count = 0
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for filename in files:
                # Handle Dockerfile specifically as it has no extension
                if filename == 'Dockerfile' and os.path.basename(root) == os.path.basename(PROJECT_ROOT):
                    full_path = os.path.join(root, filename)
                    outfile.write(f"--- Content of {os.path.relpath(full_path, PROJECT_ROOT)} ---\n")
                    outfile.write(get_file_content(full_path))
                    outfile.write("\n\n")
                    print(f"  Collected: {os.path.relpath(full_path, PROJECT_ROOT)}")
                    collected_count += 1
                    continue # Skip to next file

                # Check other files by extension
                if filename.lower().endswith(INCLUDE_EXTENSIONS) and filename != 'Dockerfile':
                    full_path = os.path.join(root, filename)
                    outfile.write(f"--- Content of {os.path.relpath(full_path, PROJECT_ROOT)} ---\n")
                    outfile.write(get_file_content(full_path))
                    outfile.write("\n\n")
                    print(f"  Collected: {os.path.relpath(full_path, PROJECT_ROOT)}")
                    collected_count += 1
                else:
                    # Optionally log skipped files for debugging if needed
                    # print(f"  Skipped (extension): {os.path.relpath(os.path.join(root, filename), PROJECT_ROOT)}")
                    pass

        print(f"\nCollected content from {collected_count} files.")
    print(f"\nFull project state report saved to: {output_path}")
    print("Please upload this file for review.")

if __name__ == "__main__":
    collect_project_state()
