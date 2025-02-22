# List Item Random Picker

This is a plugin for Obsidian (https://obsidian.md).

## Purpose

The purpose of this module is to randomly select an item from a list within a specific note in your vault.

I developed this module for my needs in Role-Playing Games (RPG), where "random tables" are very useful tools.

## Parameter

You must specify the full path and name of a note in your vault.

## Note Format

This note should contain level one headings, each followed by a markdown list.
The list can use bullet points, hyphens, or numbers; the format doesn't affect the functionality.

## Usage

When you click the toolbar icon for this plugin, you can select a heading from the note's titles using a dropdown list.
After choosing a heading and clicking the "OK" button, a random item from the list below that heading is selected and inserted into the note you are currently editing.

## List Item Compatibility

List items can be text, links ( [[ ... ]] ), or links with previews ( ![[ ... ]] ).

## Weighting Values

The following notation can be used to weight the values:

- (5) a value

The number in parentheses represents the weight of the item.

For example, the following two lists are equivalent:

```markdown
# List 1

- Item 1 with a probability of 1/6
- Item 2 with a probability of 3/6
- Item 2 with a probability of 3/6
- Item 2 with a probability of 3/6
- Item 3 with a probability of 2/6
- Item 3 with a probability of 2/6

# List 2

- Item 1 with a probability of 1/6
- (3) Item 2 with a probability of 3/6
- (2) Item 3 with a probability of 2/6
```

Specifying no weight means a weight of one.
The probability is relative to the total weight of entries in the list.