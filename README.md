# List Item Random Picker

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## Overview

The **List Item Random Picker Plugin** allows users to randomly select an item from a predefined list within an Obsidian note. 
This plugin was originally developed for Role-Playing Games (RPGs), where "random lists" are valuable tools for storytelling and decision-making.

## Features

### List creation
- Create lists containing random items, with the ability to combine multiple lists.
- Assign **weights** to specific items to influence selection probability.

### List usage
- **Simple pick** : Select a random item from a defined list inside an Obsidian note.
- **Multiple pIcks**: Write a number in your note, select it, and use the plugin to replace it with that many randomly chosen items from a selected list.

## Installation

### Manual installation

1. Download the latest release from the [GitHub Repository](https://github.com/AlastorPilkine/ListItemRandomPicker/archive/refs/heads/main.zip).
2. Extract the contents into the `.obsidian/plugins/ListItemRandomPicker` folder in your vault.
3. Restart Obsidian.
4. Open **Settings** (`Cmd/Ctrl + ,`).
5. Enable the plugin in **Settings** > **Community Plugins** > **List Item Random Picker**.

## Configuration

In **Settings** > **Community Plugins** > **List Item Random Picker**:

- **Set the note path for random lists**: Define the note that contains the random lists (e.g., `"MyFolder/myLists"`).
- **Enable warnings**: Toggle plugin warnings.
- **Limit list calls**: Define the maximum number of nested list calls to prevent infinite loops.

## Usage

### Creating a list

The specified note should contain level-one headings (`# Heading`), each followed by a Markdown list. 
The list can use bullet points (`-`), hyphens (`*`), or numbers (`1.`). 
Each item can be plain text, Obsidian links (`[[ ... ]]`), or embedded previews (`![[ ... ]]`).


```markdown
# Example

Description of the list Example

- Item 1
- Item 2
- Item 3
- Item 4
```

### Weighted selection

To give certain items a higher chance of being selected, use the following format:

```markdown
- (5) Example Item
```

The number in parentheses represents the weight, meaning items with higher values appear more frequently.

For example, these two lists are equivalent:

```markdown
# List 1

- Item 1 (1/6 probability)
- Item 2 (3/6 probability)
- Item 2 (3/6 probability)
- Item 2 (3/6 probability)
- Item 3 (2/6 probability)
- Item 3 (2/6 probability)

# List 2

- Item 1 (1/6 probability)
- (3) Item 2 (3/6 probability)
- (2) Item 3 (2/6 probability)
```

Items without explicit weights default to 1. Probabilities are determined relative to the total sum of all weights in the list.

### Selecting a random item

You can insert a randomly selected item from a list into your active note :

1. Click the toolbar icon for this plugin.
2. Select a title from the dropdown list to insert a randomly chosen item from the corresponding list into your active note. The inserted item will replace your current selection, if any.

### Multiple random items

You can also quickly generate multiple random items by selecting a number in your note and running the plugin:

1. Write a number in your note (e.g., `3`) and select this number
2. Click the toolbar icon for this plugin.
3. Select a title from the dropdown list.
4. The selected number will be replaced by that many randomly chosen items from the list into your active note. 

## License

This project is licensed under the [GPLv3 License](https://github.com/AlastorPilkine/ListItemRandomPicker?tab=GPL-3.0-1-ov-file#GPL-3.0-1-ov-file).

## Contact

For issues or suggestions, open an issue on [GitHub](https://github.com/AlastorPilkine/ListItemRandomPicker/issues).

