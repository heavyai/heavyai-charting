# !/bin/bash
if [ "$TRAVIS_BRANCH" = "master" ]
  then
  REPO_PATH=git@github.com:mapd/mapd-charting.git
  DOWNLOAD_PATH=build_docs
  COMMIT_USER="mapd-bot"
  COMMIT_EMAIL="machines@mapd.com"

  git config --global user.name "${COMMIT_USER}"
  git config --global user.email "${COMMIT_EMAIL}"
  rm -rf ${DOWNLOAD_PATH}
  git clone "${REPO_PATH}" ${DOWNLOAD_PATH}
  
  cd ${DOWNLOAD_PATH}
    npm install
    git fetch --all
    git checkout gh-pages
    git pull --rebase origin master
    npm run clean:docs
    npm run build:docs
    npm run build:example
    git add docs -f
    git add example -f
    CHANGESET=$(git rev-parse --verify HEAD)
    git commit -m "Automated documentation/example build for changeset ${CHANGESET}."
    git push origin gh-pages
  cd ..
  rm -rf ${DOWNLOAD_PATH}
fi
