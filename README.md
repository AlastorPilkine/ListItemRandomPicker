# List Item Random Picker

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This plugin allows you to manage as many lists as you want and then randomly pick items from them. It lets you create your own random tables within Obsidian, which are very useful for tabletop role-playing games (**TTRPG**).

Your lists are in Markdown format, making them easy to create, but this plugin offers many possibilities through the concept of weights or null values, for example.

Finally, your lists can contain Markdown, including Markdown that is recognized by other plugins!

![functionnality](./docs/LIRP%201%20-%20Create%20some%20lists.gif)

In the rest of this document, this plugin will be referred to by its acronym, LIRP.

## Before you start

After installing the plugin, go to its settings and specify the path and name of a note or folder in your vault.

Only this folder, and its subfolders, or this single note if you specify a note, will be taken into account.

If a note and a folder have the same name (including path), only the folder will be taken into account, and you will be notified by a warning.

## Creating a List

A list is defined by the following elements:

* **Name:** Defined by a level 1 heading (`#`), the name must be unique across all defined lists.
* **Optional Description:** Only the first line of the description will be displayed in the list selector.
* **List Items:** A level 1 Markdown list (`-`, `*`, or numbered `1.`). Each entry in the Markdown list is an item that can be randomly chosen.

It is important to note:

* The name of a list ends the previous list or the description of the note.
* A Markdown list item ends the preceding item or the description of the list.

### Example

```markdown
# My Random List
 
This is an example list.
This is the description of the list, which can be multiline, but only the first line will be shown in the selector.
 
- Element 1
This element is multiline.
This second line is still part of "Element 1".
  The spaces at the beginning of this line are part of the element and will be preserved if this element is chosen.
- Element 2
- Element 3
1. Element 4
* Element 5
```

**Note:** This plugin is compatible with MD022 and MD032. This means that empty lines preceding or following level 1 headings (`#`) and Markdown list items (`-`, `*`, `1.`) are ignored. This allows for cleaner formatting without affecting the plugin's functionality.

## Weights

The concept of weights allows you to modify the drawing probabilities of an item.

The weight is specified at the very beginning of the list item, in the form of a number in parentheses.

Thus, thanks to the weights, the following two lists are identical:

```markdown
 - Yes
 - Yes
 - Yes
 - No
```

```markdown
 - (3) Yes
 - No
```
## Null Value

The null value allows you to not draw an item. For example, you can draw a title of nobility only once in 5 times.

Note that you can put a weight on the null item.

The null value can be modified in the [settings](#settings).

### Example with Null Value

```markdown
# Titles of Nobility

- (1) Duke 
- (1) Count 
- (1) Baron 
- (2) null
```

In this example, there is a 2 in 5 chance that no title will be drawn.

## List Combination

It is possible to combine lists, i.e., to construct a list item from items randomly drawn from other lists.

You can refer to other lists using the notation `{list name}`.

The "Insert list reference" command in the command palette[^1] allows you to insert references using the selector.

### Example of List Combination

Assuming you have the lists "Male First Names", "Female First Names", "Last Names", and "Titles of Nobility", you can create a list that combines these lists:

```markdown
# Character Names

- Mr. {Male First Names} {Titles of Nobility}{Last Names}
- Ms. {Female First Names} {Titles of Nobility}{Last Names}
```

This will randomly generate character names like "Mr. John Duke Smith", "Ms. Mary Countess Johnson", or similar combinations.

**Note:**
- Thanks to the null value in the "Titles of Nobility" list, it is possible that no title will be drawn, resulting in names like "Mr. John Smith" or "Ms. Mary Johnson".
- You can chain nested combinations, i.e., combine list references that themselves contain references, etc. The maximum level of nesting is configurable in the [settings](#settings).

## Picking Items

To pick items, you can use the ribbon button or the "Insert random item from list" command in the command palette[^1].

It's important to note that the leading dash (or asterisk, or number) and any weight specified at the beginning of a list item are removed before the randomly chosen item is inserted.

### Pick Multiple Items

You can also pick multiple items at once. To do this, enter a number in the note, select it, and then insert an item. The item will be inserted as many times as the number, which will be replaced.

Everything you select after the number will be the separator for the insertion... so you can insert multiple items as a list, for example, even checkboxes.

For example, if you enter and select what is in bold:

\- [ ] **10**  
**-** **[ ]**

You can, for example, have a list of 10 checkboxes of "Character Names".

**Note:** An example of this functionality can be seen in the animated GIF at the top of this document.

## Selector

The selector appears when you want to choose a list to pick a random item from, or to insert a reference.

It adapts according to the list or plugin settings:

* **Note selection:**
    * If the plugin setting "Show note selector" is enabled and the path contains at least two notes, the selector will first ask you to choose a note.
	* Otherwise, all lists from all notes will be displayed directly.
	* If all lists within a note are hidden via their list settings, the note itself will not appear.
* **List visibility:**
    * Lists with the list setting checked will not appear in the selector when picking a random item.
    * All lists will appear in the selector when inserting a reference.
    * By default, all lists are displayed.
* **Note description:**
    * The first line of the note description is displayed in the selector.
    * A note can have a multiline description before the first level 1 heading.
* **List description:**
    * The first line of the list description is displayed in the selector.
* **MD022 and MD032 compatibility:**
    * The selector ignores empty lines preceding or following level 1 headings and Markdown list items.

## On-the-Fly Combination

You can also insert list references into your text via the command palette[^1]. And then replace all the references via the "Replace references in selection" command. Of course, as the command name suggests, you will need to select the text first.

**Note:** An example of this functionality can be seen in the animated GIF at the top of this document.

## Using Markdown

The plugin allows you to put Markdown in list items.

Since level 1 headings and first-level list items are significant for the plugin, if you want to put them in list items, you need to escape them by preceding them with the escape sequence[^2], by default `//`, configurable in the [settings](#settings).

To facilitate the use of Markdown as well as allow for clean rendering of Markdown, the null value can be useful, for example:

````markdown
- null
```
text in a code block
```
````

If the code block started on the list item line, the rendering would be incorrect.

**Note:**
- Only the line containing the null value is ignored during random selection.
- It is still possible to specify a weight before the null value, in this case, the weight applies to the markdown element.

The escape sequence can also be useful to have readable text rather than plugin errors. Example with Mermaid.

Without escaping:  
  
> - null  
> Error parsing Mermaid diagram!  
>  
> Parse error on line 2:  
> flowchart TDA[{Character Names}] -  
> --------------^  
> Expecting 'TAGEND', 'STR', 'MD_STR', 'UNICODE_TEXT', 'TEXT', 'TAGSTART', got 'DIAMOND_START'  
  
With escaping:  
  
> - null  
> //\`\`\`mermaid  
> //flowchart TD  
> // A[{Character Names}] -->|Owes money to| B({Character Names})  
> //\`\`\`

**Note:** In either case, Mermaid diagrams within randomly picked list items will render correctly.
## Settings

The plugin has three types of settings: plugin settings, list settings, and note settings.

### Plugin Settings

These settings affect the overall behavior of the plugin.

* **Path :** The path of a note or folder. Example: "Folder/Note" or "Folder"

**Specific Values:**

* **Null value:** If the first line of a list item has this value, that line is ignored. This allows you to have probabilities of getting no result. Usage example: having, or not having, a particle in a noun.
* **Escape value:** To include heading one elements or first-level list items in your random list, escape them with these values. Exemple : `// # Heading`.
* **Selection value for notification:** If the selected text has this value, the item is not inserted; instead, a notification is shown.

**Behavior:**

* **Show note selector:** If path is a folder containing at least two notes, a selector will allow you to choose the note; otherwise, all lists will be offered to you.
* **Show warning:** Are warnings displayed as notifications?
* **Delete selection value on notification:** If this setting is on, the selected notification value is removed after it's used. This setting is linked to "Selection value for notification". If enabled, when an item is notified, the selected value is removed; otherwise, it is kept
* **Reference depth limit:** Reference recursion limit: the maximum number of nested reference calls allowed. Zero disables reference resolution. Maximum value: 10 (default: 5). A high value may cause performance problems.

### Note Settings

Note settings can be inserted into the note via the "Insert note settings values" command.

They must be in the note description (i.e., before the first level 1 heading) to be taken into account.

The setting is in the form of a Markdown checkbox.

Example :
- [ ] Do not preserve comments

It manages the handling of comments in the Obsidian sense. If the box is unchecked, comments are preserved; otherwise, they are removed from the randomly chosen item.

Obsidian comments are text placed between double %.

LIRP handles only two comment formats: single-line comments or multi-line comments, only if the multi-line comment block starts and ends with a line containing only double %.

### List Settings

List settings can be inserted via the "Insert list settings values" command. Again, it must be in the list description.

It is also a checkbox.

Example :
 - [ ] Hide this list

It determines whether or not the list is present in the selector when choosing a list from which you want a random item.

Note that the list is always shown when you try to insert a list reference.

## Interface

The LIRP plugin adds the following elements to the Obsidian interface:

* **Ribbon button:**
    * A button is added to the ribbon to open the selector and choose a list.
* **Command palette[^1] commands:**
    * "Insert list reference": Inserts a list reference at the cursor location.
    * "Replace references in selection": Replaces all list references in the selection with the corresponding items.
    * "Insert note settings values": Inserts note settings values at the cursor location.
    * "Insert list settings values": Inserts list settings values at the cursor location.
    * "Insert random item from list": Performs the same action as the ribbon button.

Note that you can associate a keyboard shortcut with any command in the command palette via Obsidian's settings.

## Contact

For issues or suggestions, open an issue on [GitHub](https://github.com/AlastorPilkine/ListItemRandomPicker/issues).

[^1]: The command palette is a tool in Obsidian that provides quick access to all Obsidian commands, including those from plugins. Plugin-related commands are typically prefixed with the plugin's name. The command palette can be opened using `Ctrl+P` (or `Cmd+P` on macOS).
[^2]: An escape sequence is a series of characters that tells the plugin to treat the following character(s) literally, rather than as a command or special character.
