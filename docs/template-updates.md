# Updating your assignment with teacher updates

This project expand for several weeks using the `ULL-ESIT-PL-2526/competenciales-public-template` repository.  When the teachers update the repo with new 
files you should fetch those updates into your local repository.

## Add Remote `ULL-ESIT-PL-2526/competenciales-public-template`

When in your working copy of the assignment you have one remote `origin` pointing to your GitHub assignment repository in the PL organization. Confirm that with:

```
git remote -v
```

To get the latest updates the teachers will add during the course, you must first 
add as a remote the repo `ULL-ESIT-PL-2526/competenciales-public-template`:

```
git remote add template https://github.com/ULL-ESIT-PL-2526/competenciales-public-template.git
```

## Fetch from `template`

The teachers will announce when they have made updates to the original template repository and the branch you need to fetch.

Teachers will create a new branch per stage of the project with names `C1`, `C2`, `C3`, etc. The branch `main` will contain the latest updates. 

Fetch the latest updates from the `template` remote:

```
git fetch template 
```


This fetches the latest commits from all the branches of the `template` repository and updates your local `FETCH_HEAD`. You can view all your branches with:

```
git branch -a
```

This should show you among others the `template/main`, `template/C1`, `template/C2` etc. branches.

## Looking for what is new 

To have a look at the differences between your `main` and `template/main` branches and  see what files have changed from the last time you pick up the template remote using `git diff --name-only template/main`:

```
$ git -P diff --name-only template/main
```
```
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
$ git checkout template/main -- docs/grammar/README.md
```
```
Actualizada 1 ruta desde aeddf7e
$ git -P diff template/main README.md
$  
```

We can also use `git restore`:

```
git restore --source template/main docs/grammar/README.md
```

You can specify as many files as you want in the command: 
```
git restore --source template/main 'docs/t*.md'
````

Notice the use of quotes to avoid shell expansion of the wildcard. 
