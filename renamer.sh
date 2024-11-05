#!/bin/bash

# Ensure backstage-cli is available in PATH if installed locally
export PATH="$PATH:$(npm root -g)/@backstage/cli/node_modules/.bin"

# Define the NPM registry (if needed) and set authentication if required
NPM_REGISTRY="https://registry.npmjs.org/"

# Function to increment the patch version in package.json
increment_version() {
    local version=$1
    local base_version=${version%.*}  # Strip last part (patch version)
    local patch_version=${version##*.}  # Extract the patch version
    patch_version=$((patch_version + 5))  # Increment patch
    echo "${base_version}.${patch_version}"
}

# Function to update package.json with only the differences

# Find all package.json files excluding node_modules directories and apply updates
find . -name "node_modules" -prune -o -name "package.json" -type f -print | while read -r package_file; do
    # Get the directory of the package.json file
    package_dir=$(dirname "$package_file")

    # Navigate to the package directory
    cd "$package_dir" || exit

    # Check if package is part of @itsyndicate org
    if grep -q '"name": "@itsyndicate/' package.json; then
        echo "Processing package in $package_dir"
        yarn install

        # Extract the package name to generate pluginId if needed
        package_name=$(grep '"name": "@itsyndicate/' package.json | sed 's/.*"@itsyndicate\/\(.*\)".*/\1/')

        # Update the version in package.json
        current_version=$(grep '"version":' package.json | sed 's/.*"version": "\(.*\)",/\1/')
        new_version=$(increment_version "$current_version")
        sed -i "s/\"version\": \"$current_version\"/\"version\": \"$new_version\"/" package.json
        echo "Updated version to $new_version"

        yarn tsc
        yarn build
        # Run the build command to populate dist
        echo "Building package in $package_dir"

        # Run prepack steps if backstage-cli is installed
        if [ -f "./node_modules/.bin/backstage-cli" ]; then
            ./node_modules/.bin/backstage-cli package prepack
        else
            echo "Warning: backstage-cli not found in $package_dir. Skipping prepack."
        fi

        # Publish the package
        backstage-cli repo fix --publish
        npm publish --registry $NPM_REGISTRY || echo "Failed to publish $package_dir"
        
    else
        echo "Skipping $package_dir - not part of @itsyndicate"
    fi

    # Go back to the root directory
    cd - > /dev/null
done

echo "Publishing complete!"