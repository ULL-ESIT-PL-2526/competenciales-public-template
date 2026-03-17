# Updating your assignment with teacher updates

## Remote

When in your working copy of the assignment you must have only one remote `origin` pointing to your own fork (where you push your changes).  Confirm that with:

```
git remote -v
```

To get the latest updates the teachers have added to the original template repository, you must first 
add as a remote the repo `ULL-ESIT-PL-2526/competenciales-public-template`:

```
git remote add template https://github.com/ULL-ESIT-PL-2526/competenciales-public-template.git
```

## Fetch from `template

The teachers will announce when they have made updates to the original template repository.
This is certainly the case for projects that expand for several weeks or months using the `ULL-ESIT-PL-2526/competenciales-public-template` repository.  When that happens, you should fetch those updates into your local repository.

```
git fetch template main
```

This fetches the latest commits from the `main` branch of the `template` repository and updates your local `FETCH_HEAD`. You can view all your branches with:

```
git branch -a
```

This should show you among others the `template/main` branch.

## Looking for what is new 

Have a look at the differences between your `main` and `template/main` branches to see what files have changed from the last timeyou pick up the template remote using `git diff --name-only template/main`:

```
$ git -P diff --name-only template/main
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
$ git checkout template/main docs/grammar/README.md
Actualizada 1 ruta desde aeddf7e
$ git -P diff template/main README.md
$  
```

## Navigation: [← Previous](/README.md) | [↑ Top](/README.md) | [Next →](/docs/grammar/README.md)
