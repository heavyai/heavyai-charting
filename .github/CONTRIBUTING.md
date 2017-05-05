# Contributing to MapD's Charting library
👍🎉 Thanks for taking the time to contribute! 🎉👍

Our team welcomes and appreciates your contributions to this codebase. Every contribution helps, and our team will make sure you're given proper credit for your efforts.

You can contribute in many ways:

### Types of Issues
- [🐞 Bugs](#reporting-bugs)
- [📖 Documentation](#improving-documentation)
- [🆕 Enhancements](#suggesting-enhancements)


# 🐞 Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report :pencil:, reproduce the behavior :computer:, and find related reports. :mag_right:

Before creating bug reports, look through [existing issues](https://github.com/mapd/mapd-connector-os-testing/issues?q=is%3Aopen+is%3Aissue+label%3Abug) as you might find out that you don't need to create one and can just 👍 an existing issue. When you are creating a bug report, [include as many details as possible](#how-do-i-submit-a-good-bug-report). Fill out [the required template](ISSUE_TEMPLATE.md), the information it asks for helps us resolve issues faster.

### How Do I Submit A (Good) Bug Report?

Bugs are tracked as [GitHub issues](https://guides.github.com/features/issues/). Create an issue on that repository and provide the following information by filling in [the template](ISSUE_TEMPLATE.md).

Explain the problem and include additional details to help maintainers reproduce the problem:

* **Use a clear and descriptive title** for the issue to identify the problem.
* **Describe the exact steps which reproduce the problem** in as much detail as possible. When listing steps, don't just say *what* you did, but explain *how* you did it.
* **Provide specific examples to demonstrate the steps**. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples. If you're providing snippets in the issue, use [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
* **Explain which behavior you expected to see instead and why.**
* **Include screenshots and animated GIFs** which show you following the described steps and clearly demonstrate the problem. You can use [this tool](http://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and [this tool](https://github.com/colinkeenan/silentcast) or [this tool](https://github.com/GNOME/byzanz) on Linux. However **gifs alone are insufficient** to reproduce bugs!


# 📖 Improving Documentation
If you notice anything incorrect or missing from our documentation, correct it and open a PR!

Correcting typos and clarifying key functions and APIs are two great ways to make this library easier for everyone to use.


# 🆕 Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, ranging from minor improvements for existing functionality to completely new features. Following these guidelines helps maintainers and the community understand your suggestion :pencil: and find related suggestions. :mag_right:

**Perform a [cursory search](https://github.com/mapd/mapd-connector-os-testing/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement)** to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.

When you are creating an enhancement suggestion, [include as many details as possible](#how-do-i-submit-a-good-enhancement-suggestion). Fill in [the template](ISSUE_TEMPLATE.md), including the steps that you imagine you would take if the feature you're requesting existed.

### How Do I Submit A (Good) Enhancement Suggestion?

* **Use a clear and descriptive title** for the issue to identify the suggestion.
* **Provide a step-by-step description of the suggested enhancement** in as much detail as possible.
* **Provide specific examples to demonstrate the steps**. Include copy/pasteable snippets which you use in those examples, as [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
* **Describe the current behavior** and **explain which behavior you expected to see instead** and why.
* **Include screenshots and animated GIFs** which help you demonstrate the steps or point out which part the suggestion is related to. You can use [this tool](http://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and [this tool](https://github.com/colinkeenan/silentcast) or [this tool](https://github.com/GNOME/byzanz) on Linux.
* **Explain why this enhancement would be useful** to most users and/or devs using this code.


# Your First Code Contribution

Unsure where to begin contributing? You can start by looking for issues tagged `beginner`:

* [Beginner issues](https://github.com/mapd/mapd-connector-os-testing/issues?utf8=%E2%9C%93&q=is%3Aopen%20is%3Aissue%20label%3A%22beginner%22%20) - issues which should only require a few lines of code, and a test or two.

### Opening Pull Requests
0. Make sure to commit your built `dist/` files.
0. Give your PR a commit-worthy name, as we'll squash° the commits into that name.
0. Fill out the Pull Request checklist ☑️ that's automatically added to your PR, especially what issue(s) you're addressing.
0. GitHub will automatically check to make sure your code can be merged safely. If it can't, `git rebase master` and push your changes back up.
0. [TravisCI](travis-ci.com) 👷 will automatically check for lint, passing tests, and no decreases in code coverage. If anything fails, commit a fix and push up to rerun CI.
0. Once the branch can be merged and CI passes ✅, a core contributor will review the code and make any comments.
0. There will probably be a bit of back-and-forth during this process as your code changes in response to comments.
0. Once the PR is approved, we'll squash-merge it in! :trophy:

° Squashing makes reverting easier should that become necessary.

### Style Guide
We use an extensive linter to help prevent typos and to maintain a consistent style in the codebase. The linter runs whenever you run `npm test`. The [linter settings file contains justifications](../.eslintrc.json) for most rules, but we're open to suggestions if you're willing to make the change!


# Becoming a Core Contributor
We may ask community members who've proven themselves with consistently excellent PR and issue contributions to join our **Core Contributors** team. There they'll help curate issues, review pull requests, and keep improving the community they're leading.

As we grow our internal engineering team, we may consider hiring contributors, particularly those who've earned this level of trust.

👍🎉 Again, thanks for contributing! 🎉👍
