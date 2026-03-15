# Updating your assignment with teacher updates

## Remote

When in your working copy of the assignment you must have two remotes configured:
- `origin` pointing to your own fork (where you push your changes)
- `upstream` pointing to the original template repository (from where you pull updates)

```
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) git remote -v
origin  https://github.com/ULL-ESIT-PL-2526/dragon2js-casiano-rodriguez-leon-alu0100291865.git (fetch)
origin  https://github.com/ULL-ESIT-PL-2526/dragon2js-casiano-rodriguez-leon-alu0100291865.git (push)
upstream        https://github.com/ULL-ESIT-PL-2526/procesadores-de-lenguajes-25-26-dragon2js-dragon2js-template.git (fetch)
upstream        https://github.com/ULL-ESIT-PL-2526/procesadores-de-lenguajes-25-26-dragon2js-dragon2js-template.git (push)
```

## Fetch from upstream

The teachers will announce when they have made updates to the original template repository.
This is certainly the case for projects that expand for several weeks or months using the same repository.  When that happens, you should fetch those updates into your local repository.
To get the latest updates from the original template repository, run:

```
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) git fetch upstream main
Desde https://github.com/ULL-ESIT-PL-2526/procesadores-de-lenguajes-25-26-dragon2js-dragon2js-template
 * branch            main       -> FETCH_HEAD
```

This fetches the latest commits from the `main` branch of the `upstream` repository and updates your local `FETCH_HEAD`. Now you can merge or rebase these changes into your own `main` branch as needed.

Now your branch `upstream/main` is up to date with the latest changes from the original template repository. You can view all your branches with:

```
  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) git -P branch -a
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main
  remotes/upstream/HEAD -> upstream/main
  remotes/upstream/main
```

## Looking for what is new 

Have a look at the differences between your `main` and `upstream/main` branches to see what files have changed from the last timeyou pick up the upstream remote using `git -P diff --name-only upstream/main`:

```
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) git -P diff --name-only upstream/main
README.md
docs/grammar/README.md
docs/grammar/ast-node-types.md
docs/grammar/comparison.md
docs/grammar/grammar-rules.md
docs/grammar/historical-foundation.md
docs/grammar/jison-declarations.md
docs/grammar/jison-grammar-structure.md
docs/grammar/key-design-decisions.md
docs/grammar/overview.md
docs/grammar/precedence-summary.md
docs/grammar/references.md
docs/grammar/types/types-and-initialization.md
```

## Picking up files from upstream/main


Pick up individual files (or all of them). For instance, to bring file `docs/grammar/README.md` from the upstream branch: 

```
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) git checkout upstream/main docs/grammar/README.md
Actualizada 1 ruta desde aeddf7e
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) ✗ ls -l docs/grammar/README.md 
-rw-r--r--@ 1 casianorodriguezleon  staff  966 15 mar.  05:49 docs/grammar/README.md
```

## Merge the changes from `upstream/main` into your `main` branch:

When, after examination, you feel is safe to merge, you can merge the changes from `upstream/main` into your `main` branch: 
```
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) git merge upstream/main
```

## Navigation: [← Previous](/README.md) | [↑ Top](/README.md) | [Next →](/docs/grammar/README.md)
