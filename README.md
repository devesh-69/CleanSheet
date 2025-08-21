# Excel Pro Tools

A modern, browser-based utility belt for cleaning, comparing, and processing spreadsheet files. No need to install any software—just drag, drop, and get your cleaned data instantly.

![Excel Duplicate Remover Screenshot](https://storage.googleapis.com/proud-booth-3333/excel-duplicate-remover-screenshot.png)

## ✨ Features

This application provides a suite of tools to handle common spreadsheet tasks, all running securely in your browser.

### Core Tools
-   **Single File Duplicate Remover**: Find and remove duplicate rows within a single file.
-   **Special Characters Remover**: Strip out unwanted special characters.
-   **Find & Replace (Bulk)**: Perform multiple find-and-replace operations at once.

### Optional Cleaning Actions
_Apply these actions in combination with other tools:_
-   Remove Blank Rows/Columns
-   Trim Extra Spaces
-   Standardize Case (UPPER/lower/Proper)
-   ... and more!

### Advanced Tools
-   **Compare Two Files & Remove Duplicates**: The flagship feature. Identify rows in one file that exist in another and generate a "clean" version.
-   **Merge Multiple Files**: Combine several spreadsheet files into one.
-   **Compare Columns Within Same File**: Find differences between two columns in the same sheet.
-   **Quick Summary / Pivot-like Report**: Generate quick aggregate reports.
-   **Data Validation Checks**: Check for valid emails, phone numbers, etc.
-   **Export Duplicates as Report**: Instead of removing duplicates, export a report listing them.


## 🚀 Getting Started

This project is designed to be simple to run locally without any complex build steps.

### Prerequisites
-   A modern web browser (Chrome, Firefox, Safari, Edge).
-   A code editor like VS Code (optional, for development).

### Installation
1.  Clone the repository to your local machine:
    ```bash
    git clone https://github.com/your-username/excel-pro-tools.git
    ```
2.  Navigate into the project directory:
    ```bash
    cd excel-pro-tools
    ```
3.  Open the `index.html` file directly in your web browser. That's it!


## 🤝 Contributing

Contributions are welcome! If you'd like to help improve the tool or add new features, please follow these steps.

### 1. Fork the Repository
Click the "Fork" button at the top-right corner of the original repository page. This creates a copy of the repository in your own GitHub account.

### 2. Clone Your Fork
Clone the repository from your account to your local machine. Replace `your-username` with your actual GitHub username.
```bash
git clone https://github.com/your-username/excel-pro-tools.git
cd excel-pro-tools
```

### 3. Create a New Branch
Create a descriptive branch for your new feature or bug fix.
```bash
git checkout -b feature/add-new-formatter
```

### 4. Make and Commit Changes
Make your code changes, then stage and commit them with a clear message.
```bash
git add .
git commit -m "feat: Add a new date formatting tool"
```

### 5. Push to Your Fork
Push your new branch up to your forked repository on GitHub.
```bash
git push origin feature/add-new-formatter
```

### 6. Open a Pull Request
Go to the original repository on GitHub and you'll see a prompt to create a Pull Request from your new branch. Fill out the template and submit it for review.


## 🔄 Keeping Your Fork Updated

To keep your forked repository up-to-date with the latest changes from the original (upstream) project, you should configure an `upstream` remote.

### 1. Configure the Upstream Remote
This only needs to be done once. Add the original repository as a remote named `upstream`. Replace `original-owner/original-repo` with the actual path to the original repository.
```bash
git remote add upstream https://github.com/original-owner/original-repo.git
```
You can verify it was added by running:
```bash
git remote -v
```

### 2. Fetch Updates from Upstream
Fetch the latest changes from the `upstream` repository. This downloads the changes but doesn't merge them yet.
```bash
git fetch upstream
```

### 3. Merge Upstream Changes
Check out your main branch and merge the changes from the upstream main branch.
```bash
# Switch to your local main branch
git checkout main

# Merge the changes from the upstream's main branch into your local main branch
git merge upstream/main
```

### 4. Push Updates to Your Fork
Push the updated main branch to your own forked repository on GitHub (`origin`).
```bash
git push origin main
```
Now your fork is in sync with the original repository, and you can create new branches from an up-to-date codebase.
