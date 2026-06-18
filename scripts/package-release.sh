#!/usr/bin/env bash
set -euo pipefail

release_env="${1:-production}"
version_input="${2:-}"

package_slug="mayar-eve-builder"
package_version="$(node -p "require('./package.json').version")"

if [[ -n "$version_input" ]]; then
  version_label="${version_input#v}"
else
  version_label="$package_version"
fi

tag_name="v${version_label}"
archive_dir="${RUNNER_TEMP:-$(pwd)/dist/release}"
archive_path="${archive_dir}/${package_slug}-${release_env}-${version_label}.tar.gz"

mkdir -p "$archive_dir"
git archive --format=tar.gz --prefix="${package_slug}-${version_label}/" -o "$archive_path" HEAD

if [[ "$release_env" == "production" ]]; then
  prerelease="false"
else
  prerelease="true"
fi

{
  echo "package_slug=$package_slug"
  echo "release_env=$release_env"
  echo "version_label=$version_label"
  echo "tag_name=$tag_name"
  echo "archive_path=$archive_path"
  echo "prerelease=$prerelease"
} >>"${GITHUB_OUTPUT:-/dev/stdout}"

echo "Packaged ${package_slug} ${version_label} for ${release_env}: ${archive_path}"
