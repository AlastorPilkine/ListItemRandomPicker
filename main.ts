import { App, SuggestModal, Notice, Plugin, PluginSettingTab, Setting, TFile, MarkdownView } from 'obsidian';

function findIndexes<T>(anArray: T[], predicate: (element: T, index: number) => boolean): number[] {
    const indexes: number[] = [];
    anArray.forEach((element, index) => {
      if (predicate(element, index)) {
        indexes.push(index);
      }
    });
    return indexes;
}

function escapeRegex(stringToEscape: string): string {
    return stringToEscape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
interface LIRPPluginSettings {
    notePath: string;
    showWarning: boolean;
    maxMacroDepth: number;
}

const DEFAULT_SETTINGS: LIRPPluginSettings = {
    notePath: 'Full path of a note',
    showWarning: true,
    maxMacroDepth: 1,
};

interface LIRPListInterface {
    title: string;
    description: string;
    items: string[];
    getListSuggestion(): LIRPSuggestionInterface;
    notHidden(): boolean;
    pickRandomItem(): string;
    getWarning(): string[];
}

class LIRPList implements LIRPListInterface {
    title: string;
    description: string;
    hidden: boolean;
    items: string[];
    warning: string[]

    constructor(lines: string[]) {
        this.title = "";
        this.description = "";
        this.hidden = false;
        this.items = [];
        this.warning = [];

        const headingRegEx = /^# +(.+)$/;
        this.title = lines[0].replace(headingRegEx, "$1");
        const italicHeadingRegex = /^(_|\*)\S/;
        if (italicHeadingRegex.test(this.title)) {
            this.hidden = true;
        } else {
            this.hidden = false;
        }
        lines.shift();
        const listBeginItemRegex = /^(-|\d+\.) +(.+)$/;
        const listBeginIndexes = findIndexes(lines, (element) => listBeginItemRegex.test(element));
        if (listBeginIndexes.length === 0) {
            this.warning.push(`No items in list ${this.title}`);
            this.hidden = true;
            return;
        }
        const cleanLines = lines.map((element) => {
            return element.replace(listBeginItemRegex, "$2")
        });
        if (listBeginIndexes[0] !== 0) {
            let mdDescription = cleanLines.slice(0, listBeginIndexes[0]);
            // taking care of MD022
            //   MD022/blanks-around-headings: Headings should be surrounded by blank lines
            if (mdDescription[0] === "") {
                mdDescription.shift();
            }
            // taking care of MD032
            //   MD032/blanks-around-lists: Lists should be surrounded by blank lines
            // Due to split on '\n', the slice, and at least a join on '\n' the last '\n' is always lost !
            // So the folowing code is useless
            // if (mdDescription.at(-1) === "") {
            //     mdDescription.pop();
            // }
            this.description = mdDescription.join('\n');
        } else {
            this.description = "";
        }

        const listBeginCount = listBeginIndexes.length
        let item: string[];
        for (let currentIndex = 0; currentIndex < (listBeginCount - 1); currentIndex++) {
            item = (cleanLines.slice(listBeginIndexes[currentIndex], listBeginIndexes[currentIndex + 1]));
            this.pushItemBasedOnWeight(item);
        }
        item = (cleanLines.slice(listBeginIndexes[listBeginCount - 1]));
        // taking care of MD022
        //   MD022/blanks-around-headings: Headings should be surrounded by blank lines
        if (item.at(-1) === "") {
            item.pop();
        }        
        this.pushItemBasedOnWeight(item);
    }

    pushItemBasedOnWeight(item: string[]) : void {
        const ItemWithWeightRegEx = /^\((\d+)\)\s+(.+)$/;
        let regExExecution
        let repeat: number;
        if ((regExExecution = ItemWithWeightRegEx.exec(item[0])) !== null) {
            repeat = Number(regExExecution[1]);
            item[0] = regExExecution[2];
        } else {
            repeat = 1;
        }
        const stringItem = item.join('\n');
        for (let i = 0; i < repeat; i++) {
            this.items.push(stringItem);
        }
    };

    getListSuggestion(): LIRPSuggestionInterface {
        const suggestion = {
            title: this.title,
            description: (this.description.split('\n')[0]),
        }
        return suggestion;
    };

    notHidden(): boolean {
        return !this.hidden;
    }

    pickRandomItem(): string {
        let randomItem: string = "";
        if (this.items.length > 0) {
            randomItem = this.items[Math.floor(Math.random() * this.items.length)];
        }
        return randomItem;
    }

    getWarning(): string[] {
        return this.warning;
    }

}

interface LIRPExecMacroInterface {
    lastListTitle: string;
    modifiedItem: string;

}

interface LIRPNoteInterface {
    noteName: string;
    description: string;
    loadFromNote(noteName: string, noteContent: string): boolean;
    getNoteSuggestion(): LIRPSuggestionInterface[];
    pickRandomItemFromList(listTitle: string, macroRecursion: number): string; 
    getError(): string[];
    getWarning(): string[];
}

class LIRPNote implements LIRPNoteInterface {
    noteName: string;
    description: string;
    list: LIRPList[];
    error: string[];
    warning: string[];

    constructor () {
        this.noteName = "";
        this.description = "";
        this.list = [];
        this.error = [];
        this.warning = [];
    }

    loadFromNote(noteName: string, noteContent: string): boolean {
        this.noteName = noteName;
        const lines = noteContent.split('\n');
        const headingRegex = /^# .+$/;
        let headingIndexes = findIndexes(lines, (element) => headingRegex.test(element));
        if (headingIndexes.length === 0) {
            this.error.push(`No heading in note`);
            return false;
        }
        if (headingIndexes[0] !== 0) {
            // taking care of MD022
            //   MD022/blanks-around-headings: Headings should be surrounded by blank lines
            // Due to split on '\n', the slice, and at least a join on '\n' the last '\n' is always lost !
            this.description = lines.slice(0, headingIndexes[0]).join('\n');
        }
        const headingCount = headingIndexes.length
        for (let currentIndex = 0; currentIndex < (headingCount - 1); currentIndex++) {
            this.list.push(new LIRPList(lines.slice(headingIndexes[currentIndex], headingIndexes[currentIndex + 1])));
        }
        this.list.push(new LIRPList(lines.slice(headingIndexes[headingCount - 1])));
        return true
    }

    getNoteSuggestion(): LIRPSuggestionInterface[] {
        let noteSuggestion: LIRPSuggestionInterface[];
        noteSuggestion = [];
        this.list.forEach((element) => {
            if (element.notHidden()) {
                noteSuggestion.push(element.getListSuggestion());
            }
        });
        return noteSuggestion;
    }

    execMacroSubstitution(item: string, macroRecursion: number): LIRPExecMacroInterface {
        const stringMacroRefRegex: string = `\{(${this.list.map((element) => element.title).join('|')})\}`;
        const macroRefRegex = new RegExp (stringMacroRefRegex,'mg');
        let match;
        let modifiedItem:string = item;
        let listTitle:string = "";
        while ((match = macroRefRegex.exec(modifiedItem)) !== null) {
            let newValue: string = this.pickRandomItemFromList(match[1], -1); 
            listTitle = match[0];
            modifiedItem = modifiedItem.replace(listTitle, newValue);
            macroRefRegex.lastIndex = match.index + newValue.length;
        }
        return {
            lastListTitle: listTitle,
            modifiedItem: modifiedItem,
        };
    }

    pickRandomItemFromList(listTitle: string, macroRecursion: number): string {
        let randomItem: string = "";
        let returnOfExecMacro: LIRPExecMacroInterface = {
            lastListTitle: "",
            modifiedItem: "",
        };
        const currentList = this.list.find((element) => element.title === listTitle);
        if (currentList !== undefined) {
            randomItem = currentList.pickRandomItem();
            for (let repeat = 0; repeat < macroRecursion; repeat++) {
                returnOfExecMacro = this.execMacroSubstitution(randomItem, macroRecursion);
                randomItem = returnOfExecMacro.modifiedItem;
            }
        }
        const stringMacroRefRegex: string = `\{(${this.list.map((element) => element.title).join('|')})\}`;
        const macroRefRegex = new RegExp (stringMacroRefRegex);
        if (macroRefRegex.test(randomItem) && macroRecursion !== -1) {
            new Notice(`Macro depth limit reached in note "${this.noteName}" after calling "${returnOfExecMacro.lastListTitle}"`);
        };
        return randomItem;
    } 

    getError(): string[] {
        return this.error;
    };

    getWarning(): string[] {
        let allWarning: string[];
        allWarning = [];
        allWarning = allWarning.concat(this.warning);
        this.list.forEach((element) => {
            allWarning = allWarning.concat(element.getWarning());
        });
        let NoteWarning: string[];
        NoteWarning = [];
        allWarning.forEach((element) => 
            NoteWarning.push(`Warning in note "${this.noteName}" : ${element}`)
        );
        return NoteWarning;
    };

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
        return this.items.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
        );
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
            this.doTheJob(this.settings.notePath + '.md');
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

    async doTheJob(fullNotePath: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(fullNotePath);

        if (!file) {
            new Notice('Note not found!');
            return;
        }

        if (!(file instanceof TFile)) {
            new Notice('Invalid file type. Expected a Markdown note file.');
            return;
        }

        const content = await this.app.vault.cachedRead(file);
        const currentLIRP = new LIRPNote();

        const loadSuccess = currentLIRP.loadFromNote(this.settings.notePath, content);
        if (!loadSuccess) {
            currentLIRP.getError().forEach((element) => new Notice(element));
            return
        }
        if (this.settings.showWarning) {
            currentLIRP.getWarning().forEach(element => {
                new Notice(element);
            });
        };
        new LIRPSuggestModal(this.app, currentLIRP.getNoteSuggestion(), (title) => {
            this.insertString(currentLIRP.pickRandomItemFromList(title, this.settings.maxMacroDepth));
        }).open();
    }

    insertString(stringToInsert: string): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (activeView) {
            const editor = activeView.editor;
            const selection = editor.getSelection();
            editor.replaceSelection(stringToInsert);
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

        new Setting(containerEl)
            .setName('Note Path')
            .setDesc('The path and filename of the note that contains the lists to be used. Exemple : "Folder/Note".')
            .addText(text => text
                .setPlaceholder('Enter the path to your note')
                .setValue(this.plugin.settings.notePath)
                .onChange(async (value) => {
                    this.plugin.settings.notePath = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
        .setName("Show warning")
        .setDesc('Display the warnings of notes and lists, if any. Warnings for macro depth limit reached are always displayed.')
        .addToggle((toggle) => {
            toggle.setValue(this.plugin.settings.showWarning);
            toggle.onChange(async (value) => {
                this.plugin.settings.showWarning = value;
                await this.plugin.saveSettings();
            })
        });

        new Setting(containerEl)
              .setName("Macro depth limit")
              .setDesc("Macro recursion limit: how many nested macro calls are allowed. Zero prevents nested macros from being resolved.")
              .addSlider((slider) =>
                slider
                  .setValue(this.plugin.settings.maxMacroDepth - 1)
                  .setLimits(0, 10, 1)
                  .setDynamicTooltip()
                  .onChange(async (value) => {
                    this.plugin.settings.maxMacroDepth = value + 1;
                    await this.plugin.saveSettings();
                  })
              );
    }
}