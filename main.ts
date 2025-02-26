import { App, Modal, SuggestModal, Notice, Plugin, PluginSettingTab, Setting, TFile, MarkdownView } from 'obsidian';

function findIndexes<T>(anArray: T[], predicate: (element: T, index: number) => boolean): number[] {
    const indexes: number[] = [];
    anArray.forEach((element, index) => {
      if (predicate(element, index)) {
        indexes.push(index);
      }
    });
    return indexes;
  }
interface LIRPPluginSettings {
    notePath: string;
}

const DEFAULT_SETTINGS: LIRPPluginSettings = {
    notePath: 'Full path of a note'
};

interface LIRPListInterface {
    title: string;
    description: string;
    hidden: boolean;
    macro: boolean;
    items: string[];
    warning: string[];
    pickRandomItem(): string;
}

class LIRPList implements LIRPListInterface {
    title: string;
    description: string;
    hidden: boolean;
    macro: boolean;
    items: string[];
    warning: string[]

    constructor(lines: string[]) {
        this.items = [];
        this.warning = [];
        
        const headingRegEx = /^# +(.+)$/;
        // to do hidden list
        this.title = lines[0].replace(headingRegEx, "$1");
        lines.splice(0, 1);
        const listBeginItemRegex = /^(-|\d+\.) +(.+)$/;
        const listBeginIndexes = findIndexes(lines, (element) => listBeginItemRegex.test(element));
        if (listBeginIndexes.length === 0) {
            this.warning.push('No list items in note');
            // to do : Macro !
            return;
        }
        const cleanLines = lines.map((element) => {
            return element.replace(listBeginItemRegex, "$2")
        });
        if (listBeginIndexes[0] !== 0) {
            // there is a description
            this.description = cleanLines.slice(0, listBeginIndexes[0] -1).join('\n');
        } else {
            this.description = "";
        }

        const listBeginCount = listBeginIndexes.length
        for (let currentIndex = 0; currentIndex < (listBeginCount - 1); currentIndex++) {
            // to do item weight
            this.items.push((cleanLines.slice(listBeginIndexes[currentIndex], listBeginIndexes[currentIndex + 1]).join('\n')));
        }
        this.items.push((cleanLines.slice(listBeginIndexes[listBeginCount - 1]).join('\n')));
    }

    pickRandomItem(): string {
        if (this.items.length > 0) {
            return this.items[Math.floor(Math.random() * this.items.length)]; //.replace(/\n/g, '')
        } else {
            return "";
        }
    }

}
interface LIRPNoteInterface {
    fullPath: string;
    description: string;
    list: LIRPList[];
    error: string[];
    warning: string[];
    loadFromNote(noteFullPath: string): Promise<boolean>;
    getListSuggestion(): LIRPSuggestionInterface[];
    pickRandomItemFromList(listTitle: string): string; 
}

class LIRPNote implements LIRPNoteInterface {
    fullPath: string;
    description: string;
    list: LIRPList[];
    error: string[];
    warning: string[];
    app: App;

    constructor (app: App) {
        this.fullPath = "";
        this.description = "";
        this.list = [];
        this.error = [];
        this.warning = [];
        this.app = app;
    }

    async loadFromNote(noteFullPath: string): Promise<boolean> {
        this.fullPath = noteFullPath;
        const file = this.app.vault.getAbstractFileByPath(noteFullPath);

        if (!file) {
            this.error.push('Note not found!');
            return false;
        }

        if (!(file instanceof TFile)) {
            this.error.push('Invalid file type. Expected a Markdown note file.');
            return false;
        }

        const content = await this.app.vault.cachedRead(file);

        const lines = content.split('\n');
        const headingRegex = /^# .+$/;
        let headingIndexes = findIndexes(lines, (element) => headingRegex.test(element));
        if (headingIndexes.length === 0) {
            this.error.push('No heading in note');
            return false;
        }
        let headingBegin = 0;
        if (headingIndexes[0] !== 0) {
            // there is a description
            this.description = lines.slice(0, headingIndexes[0] -1).join('\n');
            headingBegin = headingIndexes[0];
        }
        const headingCount = headingIndexes.length
        for (let currentIndex = headingBegin; currentIndex < (headingCount - 1); currentIndex++) {
            this.list.push(new LIRPList(lines.slice(headingIndexes[currentIndex], headingIndexes[currentIndex + 1])));
        }
        this.list.push(new LIRPList(lines.slice(headingIndexes[headingCount - 1])));
        return true
    }

    getListSuggestion(): LIRPSuggestionInterface[] {

        let listSuggestion: LIRPSuggestionInterface[];
        listSuggestion = [];
        console.log('working');
        this.list.forEach((element) => {
            console.log(element);
            // to do hidden list
            listSuggestion.push({
                title: element.title,
                description: element.description,
            })
        });
        return listSuggestion;
    }

    pickRandomItemFromList(listTitle: string): string {
        const currentList = this.list.find((element) => element.title === listTitle);
        if (currentList !== undefined) {
            return currentList.pickRandomItem();
        } else {
            return ""
        }
    } 

}
interface LIRPSuggestionInterface {
    title: string;
    description: string;
}


export class LIRPSuggestModal extends SuggestModal<LIRPSuggestionInterface> {
    items: LIRPSuggestionInterface[];
    callback: (value: string) => void;
  
    constructor(app: App, items: LIRPSuggestionInterface[], callback: (value: string) => void) {
      super(app);
      this.items = items;
      this.callback = callback;
    }

    getSuggestions(query: string): LIRPSuggestionInterface[] {
        return this.items;
      }
    
    renderSuggestion(item: LIRPSuggestionInterface, el: HTMLElement) {
        el.createEl('div', { text: item.title });
        el.createEl('small', {text: item.description});
      }
  
      onChooseSuggestion(item: LIRPSuggestionInterface, evt: MouseEvent | KeyboardEvent) {
        this.callback(item.title);
      }}

export default class ListItemRandomPicker extends Plugin {
    settings: LIRPPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('list-tree', 'Pick random list item', (evt: MouseEvent) => {
            this.openTitlePicker(this.settings.notePath);
        });

        this.addCommand({
            id: 'insert-random-item',
            name: 'Insert random item from list',
            callback: () => {
                this.doTheJob(this.settings.notePath + '.md');
            }
        });

        this.addSettingTab(new LIRPSettingTab(this.app, this));
    }

    onunload() {

    }

    doTheJob(fullNotePath: string): void {
        const currentLIRP = new LIRPNote(this.app);

        const loadSuccess = currentLIRP.loadFromNote(fullNotePath);
        if (!loadSuccess) {
            currentLIRP.error.forEach((element) => new Notice(element));
            return
        }
        console.log(currentLIRP);
        new Notice("No error on load");
        console.log(currentLIRP.getListSuggestion())
        new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(), (title) => {
            this.insertString(currentLIRP.pickRandomItemFromList(title));
        }).open();
    }

    insertString(currentString: string): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (activeView) {
            const editor = activeView.editor;
            const selection = editor.getSelection();
            editor.replaceSelection(currentString);
            // const position = editor.getCursor();
            // editor.replaceRange(randomEntry, position); //, position);

            // // Déplacer le curseur à la fin de l'insertion
            // const newPosition = { line: position.line, ch: position.ch + randomEntry.length };
            // editor.setCursor(newPosition);
        } else {
            new Notice("No active Markdown editor found.");
        }

    };

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    transformerEnSuggestions(strings: string[]): LIRPSuggestionInterface[] {
        return strings.map(str => ({
          title: str,
          description: ""
        }));
      }
      
    async openTitlePicker(notePath: string) {
        const fullNotePath = notePath + '.md';
        const file = this.app.vault.getAbstractFileByPath(fullNotePath);

        if (!file) {
            new Notice('Note not found!');
            return;
        }

        if (!(file instanceof TFile)) {
            new Notice('Invalid file type. Expected a TFile.');
            return;
        }

        const content = await this.app.vault.read(file);
        const titles = this.getTitlesFromNote(content);

        if (titles.length === 0) {
            new Notice('No titles found in the note!');
            return;
        }
        new LIRPSuggestModal(this.app, this.transformerEnSuggestions(titles), (title) => {
            this.insertRandomEntry(content, title);
        }).open();
    }

    getTitlesFromNote(content: string): string[] {
        const titleRegex = /^#+\s+(.+)$/gm;
        const titles: string[] = [];
        let match;
        while ((match = titleRegex.exec(content)) !== null) {
            titles.push(match[1]);
        }
        return titles;
    }

    async insertRandomEntry(content: string, title: string) {

        const entries = this.getEntriesFromNote(content, title);

        if (entries.length === 0) {
            new Notice('No entries found for this title!');
            return;
        }
        const randomEntry = entries[Math.floor(Math.random() * entries.length)].replace(/\n/g, '');
        // const randomEntry = entries[Math.floor(Math.random() * entries.length)].trim();

        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (activeView) {
            const editor = activeView.editor;
            const selection = editor.getSelection();
            editor.replaceSelection(randomEntry);
            // const position = editor.getCursor();
            // editor.replaceRange(randomEntry, position); //, position);

            // // Déplacer le curseur à la fin de l'insertion
            // const newPosition = { line: position.line, ch: position.ch + randomEntry.length };
            // editor.setCursor(newPosition);
        } else {
            new Notice("No active Markdown editor found.");
        }
    }

    getEntriesFromNote(content: string, title: string): string[] {
        const titleRegex = new RegExp(`^#+\\s+${title}$`, 'm');
        const titleMatch = titleRegex.exec(content);

        if (!titleMatch) {
            return [];
        }

        const startIndex = titleMatch.index + titleMatch[0].length;
        let endIndex = content.indexOf('\n#', startIndex);
        if (endIndex === -1) {
            endIndex = content.length;
        }

        const listItemRegex = /^(-|\d+\.) +(.+)$/gm;
        const entries: string[] = [];
        let currentEntry;
        let currentEntrySplit;
        let repeat: number;
        let itemString: string;
        const listContent = content.substring(startIndex, endIndex);
        while ((currentEntry = listItemRegex.exec(listContent)) !== null) {
            let fullString = currentEntry[2];
            const itemWithNumberRegEx = /^\((\d+)\)\s+(.+)$/m;
            if ((currentEntrySplit = itemWithNumberRegEx.exec(fullString)) !== null) {
                repeat = Number(currentEntrySplit[1]);
                itemString = currentEntrySplit[2];
            } else {
                repeat = 1;
                itemString = fullString;
            }
            for (let i = 0; i < repeat; i++) {
                entries.push(itemString);
            }
        }
        return entries;
    }
}

class LIRPSettingTab extends PluginSettingTab {
    plugin: ListItemRandomPicker;

    constructor(app: App, plugin: ListItemRandomPicker) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // containerEl.createEl('h2', { text: 'Settings for List Item Random Picker.' });

        new Setting(containerEl)
            .setName('Note Path')
            .setDesc('Path to the note containing the lists.')
            .addText(text => text
                .setPlaceholder('Enter the path to your note')
                .setValue(this.plugin.settings.notePath)
                .onChange(async (value) => {
                    this.plugin.settings.notePath = value;
                    await this.plugin.saveSettings();
                }));
    }
}