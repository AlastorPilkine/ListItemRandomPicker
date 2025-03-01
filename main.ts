import { exec } from 'child_process';
import { App, SuggestModal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, MarkdownView} from 'obsidian';

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
    selectionForNotification: string;
    deleteSelectionForNotification: boolean;
    nullValue: string;
    escapeValue: string;
    showNoteSelector: boolean;
}

const DEFAULT_SETTINGS: LIRPPluginSettings = {
    notePath: 'Path of a note or a folder',
    showWarning: true,
    maxMacroDepth: 1,
    selectionForNotification: '!',
    deleteSelectionForNotification: false,
    nullValue: 'null',
    escapeValue: '//',
    showNoteSelector: true,
};

interface LIRPListInterface {
    title: string;
    description: string;
    items: string[];
    getSuggestion(noteName: string): LIRPSuggestionInterface;
    notHidden(): boolean;
    pickRandomItem(): string;
    getWarning(): string[];
}

class LIRPList implements LIRPListInterface {
    title: string;
    description: string;
    hidden: boolean;
    items: string[];
    warning: string[];
    nullValue: string;
    escapeString: string;

    constructor(lines: string[], nullValue: string, escapeString: string) {
        this.title = "";
        this.description = "";
        this.hidden = false;
        this.items = [];
        this.warning = [];
        this.nullValue = nullValue;
        this.escapeString = escapeString;

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
        let regExExecution;
        let repeat: number;
        if ((regExExecution = ItemWithWeightRegEx.exec(item[0])) !== null) {
            repeat = Number(regExExecution[1]);
            item[0] = regExExecution[2];
        } else {
            repeat = 1;
        }
        if (item[0] === this.nullValue) {
            if (item.length === 1) {
                item[0] = "";
            } else {
                item.shift()
            };
        };
        const stringRegex = `^ *${this.escapeString}(.*)`;
        const escapeStringRegEx = new RegExp(stringRegex, 'gm');
        const escapeItem = item.map((element) => {
            return element.replace(escapeStringRegEx, '$1');
        });
        const stringItem = escapeItem.join('\n');
        for (let i = 0; i < repeat; i++) {
            this.items.push(stringItem);
        }
    };

    getSuggestion(noteName: string): LIRPSuggestionInterface {
        const suggestion = {
            noteName: noteName,
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
    loadFromNote(noteName: string, noteContent: string): boolean;
    getListSuggestion(): LIRPSuggestionInterface[];
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
    nullValue: string;
    escapeString: string;

    constructor (nullValue: string, escapeString: string) {
        this.noteName = "";
        this.description = "";
        this.list = [];
        this.error = [];
        this.warning = [];
        this.nullValue = nullValue;
        this.escapeString = escapeString;
    }

    loadFromNote(noteName: string, noteContent: string, ): boolean {
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
            this.list.push(new LIRPList(lines.slice(headingIndexes[currentIndex], headingIndexes[currentIndex + 1]), this.nullValue, this.escapeString));
        }
        this.list.push(new LIRPList(lines.slice(headingIndexes[headingCount - 1]), this.nullValue, this.escapeString));
        return true
    }

    getListSuggestion(): LIRPSuggestionInterface[] {
        let noteSuggestion: LIRPSuggestionInterface[];
        noteSuggestion = [];
        this.list.forEach((element) => {
            if (element.notHidden()) {
                noteSuggestion.push(element.getSuggestion(this.noteName));
            }
        });
        return noteSuggestion;
    }

    execMacroSubstitution(item: string, macroRecursion: number): LIRPExecMacroInterface {
        const stringMacroRefRegex: string = `\{(${this.list.map((element) => escapeRegex(element.title)).join('|')})\}`;
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
            lastListTitle: listTitle,
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

class LIRPMultiNote implements LIRPNoteInterface {
    multiNote: LIRPNote[];
    nullValue: string;
    escapeString: string;
    noteSelected: LIRPNote|undefined;

    constructor (nullValue: string, escapeString: string) {
        this.multiNote = [];
        this.nullValue = nullValue;
        this.escapeString = escapeString;
        this.noteSelected = undefined;
    };

    selectNote(noteName: string): boolean {
        this.noteSelected = this.multiNote.find((element) => element.noteName === noteName);
        return (this.noteSelected !== undefined);
    };

    loadFromNote(noteName: string, noteContent: string): boolean {
        const currentNote = new LIRPNote(this.nullValue, this.escapeString);
        const status = currentNote.loadFromNote(noteName, noteContent);
        this.multiNote.push(currentNote);
        return status;
    };

    getListSuggestion(): LIRPSuggestionInterface[] {
        if (this.noteSelected !== undefined) {
            return this.noteSelected.getListSuggestion();
        } else {
            let allListSuggestion: LIRPSuggestionInterface[] = [];
            this.multiNote.map((element) => {
                allListSuggestion = allListSuggestion.concat(element.getListSuggestion())
            });
            return allListSuggestion;
        }
    };

    getNoteSuggestion(): LIRPSuggestionInterface[] {
        let noteSuggestion: LIRPSuggestionInterface[] = [];
        this.multiNote.map((element) => {
            noteSuggestion.push({
                noteName: element.noteName,
                title: element.noteName,
                description: (element.description.split('\n')[0]),
            });
        });
        return noteSuggestion;
    };
    
    pickRandomItemFromList(listTitle: string, macroRecursion: number): string {
        if (this.noteSelected !== undefined) {
            return this.noteSelected.pickRandomItemFromList(listTitle, macroRecursion);
        } else {
            return "";
        }
    }; 

    pickRandomWithCrossNoteMacro(listTitle: string, macroRecursion: number): string {
        let superNote = new LIRPNote(this.nullValue, this.escapeString);
        this.multiNote.map((element) => {
            superNote.list = superNote.list.concat(element.list);
        });
        return superNote.pickRandomItemFromList(listTitle, macroRecursion);
    };

    getError(): string[] {
        if (this.noteSelected !== undefined) {
            return this.noteSelected.getError();
        } else {
            let allError:string[] = [];
            this.multiNote.map((element) => {
                allError = allError.concat(element.getError());
            });
            return allError;
        }
    };

    getWarning(): string[] {
        if (this.noteSelected !== undefined) {
            return this.noteSelected.getWarning();
        } else {
            let allWarning:string[] = [];
            this.multiNote.map((element) => {
                allWarning = allWarning.concat(element.getWarning());
            });
            return allWarning;
        }
    };


};

interface LIRPSuggestionInterface {
    noteName: string;
    title: string;
    description: string;
}

export class LIRPSuggestModal extends SuggestModal<LIRPSuggestionInterface> {
    items: LIRPSuggestionInterface[];
    callback: (value: LIRPSuggestionInterface) => void;
  
    constructor(app: App, items: LIRPSuggestionInterface[], callback: (value: LIRPSuggestionInterface) => void) {
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
        this.callback(item);
      }}

export default class ListItemRandomPicker extends Plugin {
    settings: LIRPPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('list-tree', 'Pick random list item', (evt: MouseEvent) => {
            this.doTheJob(this.settings.notePath);
        });

        this.addCommand({
            id: 'insert-random-item',
            name: 'Insert random item from list',
            callback: () => {
                this.doTheJob(this.settings.notePath);
            }
        });

        this.addSettingTab(new LIRPSettingTab(this.app, this));
    }

    onunload() {

    }

    async doTheJob(fullNotePath: string): Promise<void> {
        const currentLIRP = new LIRPMultiNote(this.settings.nullValue, this.settings.escapeValue);

        let fileSystemObject = this.app.vault.getAbstractFileByPath(fullNotePath);
        if (fileSystemObject instanceof TFolder) {
            let loadWithoutError:boolean = true;
            for (const currentFSObject of fileSystemObject.children) {
                if (currentFSObject.path.endsWith(".md")) {
                    const currentFile = this.app.vault.getAbstractFileByPath(currentFSObject.path);
                    if (currentFile instanceof TFile) {
                        const content = await this.app.vault.cachedRead(currentFile);
                        loadWithoutError =  loadWithoutError && currentLIRP.loadFromNote(currentFSObject.path.slice(0, -3), content);
                    }
                    
                }
              }
            if (!loadWithoutError) {
                currentLIRP.getError().map((element) => {
                    new Notice(element);
                });
                return
            }
            if (this.settings.showWarning) {
                currentLIRP.getWarning().forEach(element => {
                    new Notice(element);
                });
            };
            if (this.settings.showNoteSelector) {
                new LIRPSuggestModal(this.app, currentLIRP.getNoteSuggestion(), (item) => {
                    currentLIRP.selectNote(item.title);
                    new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(), (item) => {
                        this.workWithTitle(currentLIRP, item.title);
                    }).open();
                }).open();
            } else {
                new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(), (item) => {
                    currentLIRP.selectNote(item.noteName);
                    this.workWithTitle(currentLIRP, item.title);
                }).open();
            }
        } else {
            fileSystemObject = this.app.vault.getAbstractFileByPath(fullNotePath + '.md');
            if (fileSystemObject instanceof TFile) {
                const content = await this.app.vault.cachedRead(fileSystemObject);
                
                const loadSuccess = currentLIRP.loadFromNote(this.settings.notePath, content);
                if (!loadSuccess) {
                    currentLIRP.getError().forEach((element) => new Notice(element));
                    return
                }
                currentLIRP.selectNote(this.settings.notePath);
                if (this.settings.showWarning) {
                    currentLIRP.getWarning().forEach(element => {
                        new Notice(element);
                    });
                };
                new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(), (item) => {
                    this.workWithTitle(currentLIRP, item.title);
                }).open();
            } else {
                new Notice('Error : check settings "Path " in plugin List Item Random Picker !');
                return;
            };
        };
    }

    workWithTitle(Note: LIRPNoteInterface, listTitle: string): void {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

            if (activeView) {
                const selectionForNotificationRegex:string = `^${this.settings.selectionForNotification}$`;
                const noticeRegex = new RegExp(selectionForNotificationRegex);
        
                const editor = activeView.editor;
                const selection = editor.getSelection();

                if (noticeRegex.test(selection)) {
                    new Notice(Note.pickRandomItemFromList(listTitle, this.settings.maxMacroDepth));
                    if (this.settings.deleteSelectionForNotification) {
                        editor.replaceSelection('');
                    }
                } else {
                    let stringToInsert: string = '';
                    const repeatInsertRegEx = /^(\d+)(.*)/gm;
                    let regExExecution;
                    let repeat: number;
                    if ((regExExecution = repeatInsertRegEx.exec(selection)) !== null) {
                        const repeat = Number(regExExecution[1]);
                        const delimiter = selection.replace(/^\d+/, '');
                        const arrayStringToinsert: string[] = [];
                        for (let i = 0; i < repeat; i++) {
                            arrayStringToinsert.push(Note.pickRandomItemFromList(listTitle, this.settings.maxMacroDepth));
                        }
                        stringToInsert = arrayStringToinsert.join(delimiter);
                    } else {
                        stringToInsert = Note.pickRandomItemFromList(listTitle, this.settings.maxMacroDepth);
                    }
                    editor.replaceSelection(stringToInsert);
                };
            } else {
                new Notice("No active Markdown editor found.");
            };
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

        containerEl.createEl('h2', { text: 'Note setting' });

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

        containerEl.createEl('h2', { text: 'Interface settings' });

        new Setting(containerEl)
            .setName('Show note selector')
            .setDesc('If path is a folder')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.showNoteSelector);
                toggle.onChange(async (value) => {
                    this.plugin.settings.showNoteSelector = value;
                    await this.plugin.saveSettings();
                })
            });

        new Setting(containerEl)
            .setName('Show warning')
            .setDesc('Display the warnings of notes and lists, if any. Warnings for macro depth limit reached are always displayed.')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.showWarning);
                toggle.onChange(async (value) => {
                    this.plugin.settings.showWarning = value;
                    await this.plugin.saveSettings();
                })
            });

        containerEl.createEl('h2', { text: 'List settings' });

        new Setting(containerEl)
            .setName('Null value')
            .setDesc('If the first line of an item has this value, the line is flush.')
            .addText(text => text
                .setPlaceholder('Enter value')
                .setValue(this.plugin.settings.nullValue)
                .onChange(async (value) => {
                    this.plugin.settings.nullValue = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Escape value')
            .setDesc('If you want some headin one or first level list item in your item, you could escape them with these value')
            .addText(text => text
                .setPlaceholder('Enter value')
                .setValue(this.plugin.settings.escapeValue)
                .onChange(async (value) => {
                    this.plugin.settings.escapeValue = value;
                    await this.plugin.saveSettings();
                })
            );

        containerEl.createEl('h2', { text: 'Selection settings' });

        new Setting(containerEl)
            .setName('Selection value for notification')
            .setDesc('If the text selected has this value, the item is not inserted, but notified !')
            .addText(text => text
                .setPlaceholder('Enter value')
                .setValue(this.plugin.settings.selectionForNotification)
                .onChange(async (value) => {
                    this.plugin.settings.selectionForNotification = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Delete selection value for notification')
            .setDesc('If set, the selected value for notification is deleted.')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.deleteSelectionForNotification);
                toggle.onChange(async (value) => {
                    this.plugin.settings.deleteSelectionForNotification = value;
                    await this.plugin.saveSettings();
                })
            });

            containerEl.createEl('h2', { text: 'Technical settings' });

            new Setting(containerEl)
                .setName('Macro depth limit')
                .setDesc('Macro recursion limit: how many nested macro calls are allowed. Zero prevents nested macros from being resolved.')
                .addSlider((slider) =>
                    slider
                        .setValue(this.plugin.settings.maxMacroDepth)
                        .setLimits(0, 10, 1)
                        .setDynamicTooltip()
                        .onChange(async (value) => {
                        this.plugin.settings.maxMacroDepth = value;
                        await this.plugin.saveSettings();
                        })
                );
    
        }
}