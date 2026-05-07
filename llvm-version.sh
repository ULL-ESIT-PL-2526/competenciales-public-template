# Read argument from command line. If it is 14 then set the environment variables for llvm@14, otherwise 
# set to 21
# Execute this script in the terminal with `source llvm-version.sh 14` or `source llvm-version.sh 21` to set the environment variables for the desired LLVM version.

# If not 14 or 21 print help message
if [ "$1" = "-h" ] || [ "$1" = "--help" ] || [ -z "$1" ] || [ "$1" != "14" ] && [ "$1" != "21" ]; then
  echo "Usage: source llvm-version.sh [14|21]"
  return
fi
BREW_PREFIX=$(brew --prefix)
if [ "$1" = "14" ]; then
  LLVM_ADD="$BREW_PREFIX/opt/llvm@14"
  LLVM_REMOVE="$BREW_PREFIX/opt/llvm@21"
else
  LLVM_ADD="$BREW_PREFIX/opt/llvm@21"
  LLVM_REMOVE="$BREW_PREFIX/opt/llvm@14"
fi
# See https://github.com/cucapra/node-llvmc/tree/master For the node-llvm binding to work, If you build LLVM yourself, set LLVM_BUILD_LLVM_DYLIB=On to get the shared library
export LLVM_BUILD_LLVM_DYLIB=On
# Remove the other version and any duplicate of the target from LD_LIBRARY_PATH, then prepend
LD_LIBRARY_PATH=$(echo "$LD_LIBRARY_PATH" | tr ':' '\n' | grep -vF "$LLVM_REMOVE/lib" | grep -vF "$LLVM_ADD/lib" | tr '\n' ':' | sed 's/:$//')
# Prepend the new version's lib directory to LD_LIBRARY_PATH, ensuring it takes precedence over the old version.
export LD_LIBRARY_PATH="$LLVM_ADD/lib:$LD_LIBRARY_PATH"
# Remove the other version and any duplicate of the target from PATH, then prepend
PATH=$(echo "$PATH" | tr ':' '\n' | grep -vF "$LLVM_REMOVE/bin" | grep -vF "$LLVM_ADD/bin" | tr '\n' ':' | sed 's/:$//')
export PATH="$LLVM_ADD/bin:$PATH"

LDFLAGS=$(echo "$LDFLAGS" | tr ' ' '\n' | grep -vF "$LLVM_REMOVE/lib" | grep -vF "$LLVM_ADD/lib" | tr '\n' ' ' | sed 's/ $//')
export LDFLAGS="$LDFLAGS -L$LLVM_ADD/lib"

CPPFLAGS=$(echo "$CPPFLAGS" | tr ' ' '\n' | grep -vF "$LLVM_REMOVE/include" | grep -vF "$LLVM_ADD/include" | tr '\n' ' ' | sed 's/ $//')
export CPPFLAGS="$CPPFLAGS -I$LLVM_ADD/include"

export CMAKE_PREFIX_PATH="$LLVM_ADD"