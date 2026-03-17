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
git remote add template https://github.com/ULL-ESIT-PL-2526/competenciales-public-template.git
```
And then fetch the latest changes from the `main` branch of the `upstream` repository:

```
git fetch template main
```

This fetches the latest commits from the `main` branch of the `template` repository and updates your local `FETCH_HEAD`. 
You can view all your branches with:

```
git -P branch -a
```
This should show you the `template/main` branch, which is the latest state of the `main` branch from the `template` repository.

## Looking for what is new 

Have a look at the differences between your `main` and `template/main` branches to see what files have changed from the last timeyou pick up the template remote using `git -P diff --name-only template/main`:

```
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) git -P diff --name-only template/main
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

## Picking up files from template/main


Pick up individual files (or all of them). For instance, to bring file `docs/grammar/README.md` from the template branch: 

```
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) git checkout template/main docs/grammar/README.md
Actualizada 1 ruta desde aeddf7e
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) ✗ git -P diff template/main README.md
➜  dragon2js-casiano-rodriguez-leon-alu0100291865 git:(main) ✗ 
```

## Navigation: [← Previous](/README.md) | [↑ Top](/README.md) | [Next →](/docs/grammar/README.md)
