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

//-----------------------------------------------------------------
class DiceRoller {
    checkDice(diceString: string): boolean {
      const diceRegex = /^(\d+)?d(\d+)([\+\-]\d+)?(e)?(k\d+)?(kl\d+)?$/i;
      return diceRegex.test(diceString);
    };
  
    rollDice(diceString: string): number {
      if (!this.checkDice(diceString)) {
        throw new Error("Syntaxe de lancer de dés invalide.");
      }
  
      const [_, countStr, sidesStr, modifierStr, explodeStr, keepStr, keepLowStr] =
        diceString.match(
          /^(\d+)?d(\d+)([\+\-]\d+)?(e)?(k\d+)?(kl\d+)?$/i
        ) as RegExpMatchArray;
  
      const count = parseInt(countStr || "1");
      const sides = parseInt(sidesStr);
      const modifier = parseInt(modifierStr || "0");
      const explode = !!explodeStr;
      const keep = keepStr ? parseInt(keepStr.slice(1)) : undefined;
      const keepLow = keepLowStr ? parseInt(keepLowStr.slice(2)) : undefined;
  
      let results: number[] = [];
      for (let i = 0; i < count; i++) {
        let result = Math.floor(Math.random() * sides) + 1;
        results.push(result);
  
        if (explode) {
          while (result === sides) {
            result = Math.floor(Math.random() * sides) + 1;
            results.push(result);
          }
        }
      }
  
      if (keep) {
        results.sort((a, b) => b - a);
        results = results.slice(0, keep);
      } else if (keepLow) {
        results.sort((a, b) => a - b);
        results = results.slice(0, keepLow);
      }
  
      const sum = results.reduce((acc, val) => acc + val, 0);
      return sum + modifier;
    };
  
    /**
     * Remplace les lancers de dés encadrés par des délimiteurs dans une chaîne multi-lignes.
     *
     * @param {string} text Le texte multi-lignes contenant les lancers de dés.
     * @param {string} startDelimiter Le délimiteur de début des lancers de dés.
     * @param {string} endDelimiter Le délimiteur de fin des lancers de dés.
     * @returns {string} Le texte avec les lancers de dés remplacés par leurs résultats.
     */
    replaceDiceRolls(
      text: string,
      startDelimiter: string,
      endDelimiter: string
    ): string {
      const regex = new RegExp(
        `${this.escapeRegExp(startDelimiter)}([^${this.escapeRegExp(
          startDelimiter + endDelimiter
        )}]+)${this.escapeRegExp(endDelimiter)}`,
        "g"
      );
  
      return text.replace(regex, (match, diceString) => {
        try {
          const result = this.rollDice(diceString);
          return result.toString();
        } catch (error) {
          return match; // Si la syntaxe est invalide, on garde le texte d'origine
        }
      });
    };
  
    /**
     * Échappe les caractères spéciaux pour une utilisation dans une expression régulière.
     *
     * @param {string} string La chaîne de caractères à échapper.
     * @returns {string} La chaîne de caractères échappée.
     */
    private escapeRegExp(string: string): string {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };
  };
//-----------------------------------------------------------------

type LIRPLogStatus = 'dupInNote' | 'dupInFolder' | 'emptyList' | 'emptyNote';
type LIRPLogType = 'error' | 'warning';

class LIRPLogElement {
    noteName: string;
    listTitle: string;
    status: LIRPLogStatus;
    complement: string;

    getType(): LIRPLogType {
        const errors: string[] = ['dupInNote', 'dupInFolder'];
        return 'warning';
        // if (errors.contains(this.status)) {
        //     return 'error'
        // } else {
        //     return 'warning'
        // }
    };

    constructor (noteName: string, listTitle: string, status: LIRPLogStatus, complement: string = '') {
        this.noteName = noteName;
        this.listTitle = listTitle;
        this.status = status;
        this.complement = complement;
    };

    toString(): string {
        return `${this.getType()} / ${this.noteName} / ${this.listTitle} / ${this.status} / ${this.complement}`;
    };
};
class LIRPLog {
    logs: LIRPLogElement[];

    constructor() {
        this.logs = [];
    };
    
    push(noteName: string, listTitle: string, status: LIRPLogStatus, complement: string = ''): void {
        this.logs.push(new LIRPLogElement(noteName, listTitle, status, complement));
    };

    add(logs: LIRPLog):void{
        this.logs = this.logs.concat(logs.logs);
    };

    get(type: LIRPLogType): string[]{
        const logsForType = this.logs.filter((element) => 
            element.getType() === type
        );
        let getArray: string[] = [];
        logsForType.map((element) => {
            getArray.push(element.toString());
        });
        return getArray;
    }
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
    logs: LIRPLog;
    nullValue: string;
    escapeString: string;

    static getSettingString(value: '' | 'hide' | 'hide_ticked' = ''): string {
        if (value === '') {
            return '- [ ] Hide this list\n'
        } else {
            switch (value) {
                case 'hide':
                    return '^\- \\[[x ]\\] Hide this list$';
                case 'hide_ticked':
                    return '^\- \\[x\\] Hide this list$';
            };
        };
    };

    constructor(noteName: string, lines: string[], nullValue: string, escapeString: string) {
        this.title = "";
        this.description = "";
        this.hidden = false;
        this.items = [];
        this.logs = new LIRPLog();
        this.nullValue = nullValue;
        this.escapeString = escapeString;

        const headingRegEx = /^# +(.+)$/;
        this.title = lines[0].replace(headingRegEx, "$1");
        lines.shift();
        const listBeginItemRegex = /^(-|\d+\.) (?!\[) *(.+)$/;
        const listBeginIndexes = findIndexes(lines, (element) => listBeginItemRegex.test(element));
        if (listBeginIndexes.length === 0) {
            this.logs.push(noteName, this.title, 'emptyList');
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
            let isHidden: boolean = false;
            const hideRegexTicked = new RegExp (LIRPList.getSettingString('hide_ticked'));
            const hideRegex = new RegExp (LIRPList.getSettingString('hide'));
            mdDescription.map((element) => {
                if (hideRegexTicked.test(element)) {
                    isHidden = true;
                    this.hidden = isHidden;
                };
            });
            mdDescription = mdDescription.filter((element) => !(hideRegex.test(element)));
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
        return this.logs.get('warning');
    }

}

interface LIRPExecRefSubInterface {
    lastListTitle: string;
    modifiedItem: string;
}

interface LIRPNoteInterface {
    loadFromNote(noteName: string, noteContent: string): boolean;
    getListSuggestion(): LIRPSuggestionList;
    pickRandomItemFromList(listTitle: string, workOnReference: boolean): string; 
    getError(): string[];
    getWarning(): string[];
}

class LIRPNote implements LIRPNoteInterface {
    noteName: string;
    description: string;
    list: LIRPList[];
    logs: LIRPLog;
    nullValue: string;
    escapeString: string;
    rollDice: boolean;
    referenceMaxDepth: number;

    constructor (nullValue: string, escapeString: string, referenceMaxDepth: number) {
        this.noteName = "";
        this.description = "";
        this.list = [];
        this.logs = new LIRPLog();
        this.nullValue = nullValue;
        this.escapeString = escapeString;
        this.rollDice = true;
        this.referenceMaxDepth = referenceMaxDepth;
    }

    getListTitles() : string[] {
        let listTitles:string[] = [];
        this.list.map((element) => {
            listTitles.push(element.title);
        });
        return listTitles;
    };

    loadFromNote(noteName: string, noteContent: string, ): boolean {
        this.noteName = noteName;
        const lines = noteContent.split('\n');
        const headingRegex = /^# .+$/;
        let headingIndexes = findIndexes(lines, (element) => headingRegex.test(element));
        if (headingIndexes.length === 0) {
            this.logs.push(noteName, '', 'emptyNote');
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
                this.pushListIfNotExists(new LIRPList(this.noteName, lines.slice(headingIndexes[currentIndex], headingIndexes[currentIndex + 1]), this.nullValue, this.escapeString));
        };
        this.pushListIfNotExists(new LIRPList(this.noteName, lines.slice(headingIndexes[headingCount - 1]), this.nullValue, this.escapeString));
        return true
    };

    pushListIfNotExists(listToPush: LIRPList): boolean {
        if (this.getListTitles().contains(listToPush.title)) {
            this.logs.push(this.noteName, listToPush.title, 'dupInNote');
            return false;
        } else {
            this.list.push(listToPush);
            return true;
        };
    };

    getListSuggestion(withHidden: boolean = false): LIRPSuggestionList {
        const noteSuggestion = new LIRPSuggestionList();
        this.list.forEach((element) => {
            if (withHidden || element.notHidden()) {
                noteSuggestion.push(element.getSuggestion(this.noteName));
            }
        });
        return noteSuggestion;
    }

    execReferenceSubstitution(item: string): LIRPExecRefSubInterface {
        const stringMacroRefRegex: string = `\{(${this.list.map((element) => escapeRegex(element.title)).join('|')})\}`;
        const macroRefRegex = new RegExp (stringMacroRefRegex,'mg');
        let match;
        let modifiedItem:string = item;
        let listTitle:string = "";
        while ((match = macroRefRegex.exec(modifiedItem)) !== null) {
            let newValue: string = this.pickRandomItemFromList(match[1], false); 
            listTitle = match[0];
            modifiedItem = modifiedItem.replace(listTitle, newValue);
            macroRefRegex.lastIndex = match.index + newValue.length;
        }
        return {
            lastListTitle: listTitle,
            modifiedItem: modifiedItem,
        };
    }

    pickRandomItemFromList(listTitle: string, workOnReference: boolean = true): string {
        let randomItem: string = "";
        let returnOfExecMacro: LIRPExecRefSubInterface = {
            lastListTitle: listTitle,
            modifiedItem: "",
        };
        const currentList = this.list.find((element) => element.title === listTitle);
        if (currentList !== undefined) {
            randomItem = currentList.pickRandomItem();
            for (let repeat = 0; repeat < this.referenceMaxDepth; repeat++) {
                returnOfExecMacro = this.execReferenceSubstitution(randomItem);
                randomItem = returnOfExecMacro.modifiedItem;
            }
        }
        const stringMacroRefRegex: string = `\{(${this.list.map((element) => escapeRegex(element.title)).join('|')})\}`;
        const macroRefRegex = new RegExp (stringMacroRefRegex);
        if (macroRefRegex.test(randomItem) && workOnReference) {
            new Notice(`Macro depth limit reached in note "${this.noteName}" after calling "${returnOfExecMacro.lastListTitle}"`);
        };
        if (workOnReference && this.rollDice) {
            const diceRoller = new DiceRoller();
            return diceRoller.replaceDiceRolls(randomItem,'{','}');
        } else {
            return randomItem;
        }
    } 

    getError(): string[] {
        return this.logs.get('error');
    };

    getWarning(): string[] {
        let allWarning: string[] = this.logs.get('warning');
        this.list.forEach((element) => {
            allWarning = allWarning.concat(element.getWarning());
        });
        return allWarning
    };

    get length(): number {
        return this.list.length;
    };
}

class LIRPMultiNote implements LIRPNoteInterface {
    multiNote: LIRPNote[];
    nullValue: string;
    escapeString: string;
    referenceMaxDepth: number;
    logs: LIRPLog;

    constructor (nullValue: string, escapeString: string, referenceMaxDepth: number) {
        this.multiNote = [];
        this.nullValue = nullValue;
        this.escapeString = escapeString;
        this.referenceMaxDepth = referenceMaxDepth;
        this.logs = new LIRPLog();
    };

    loadFromNote(noteName: string, noteContent: string): boolean {
        const currentNote = new LIRPNote(this.nullValue, this.escapeString, this.referenceMaxDepth);
        const status = currentNote.loadFromNote(noteName, noteContent);
        this.pushNoteIfListNotExists(currentNote);
        return status;
    };

    pushNoteIfListNotExists(noteToPush: LIRPNote): boolean {
        const allListTitle = this.getListTitles();
        let unic:boolean = true;
        noteToPush.getListTitles().map((element) => {
            if (allListTitle.contains(element)) {
                this.logs.push(noteToPush.noteName, element, 'dupInFolder', this.getNoteNameFromListTitle(element));
                unic = false;
            }
        });
        if (unic) {
            this.multiNote.push(noteToPush);
        } else {
            this.logs.add(noteToPush.logs);
        };
        return unic;
    };

    getNoteNameFromListTitle(listTitle: string): string {
        let note = this.multiNote.find((element) =>
            element.getListTitles().contains(listTitle)
        );
        if (note !== undefined) {
            return note.noteName;
        } else {
            return '';
        };
    };
    
    getListTitles() : string[] {
        let listTitles:string[] = [];
        this.multiNote.map((element) => {
            listTitles = listTitles.concat(element.getListTitles());
        });
        return listTitles;
    };

    getListSuggestion(withHidden: boolean = false): LIRPSuggestionList {
        let allListSuggestion = new LIRPSuggestionList();
        this.multiNote.map((element) => {
            allListSuggestion = allListSuggestion.concat(element.getListSuggestion())
        });
        return allListSuggestion;
    };

    getNoteSuggestion(withHidden: boolean = false): LIRPSuggestionList {
        let noteSuggestion = new LIRPSuggestionList;
        this.multiNote.map((element) => {
            if (element.getListSuggestion(withHidden).length > 0) {
                noteSuggestion.push({
                    noteName: element.noteName,
                    title: element.noteName,
                    description: (element.description.split('\n')[0]),
                });
            };
        });
        return noteSuggestion;
    };

    pickRandomItemFromList(listTitle: string, workOnReference: boolean = true): string {
        let superNote = new LIRPNote(this.nullValue, this.escapeString, this.referenceMaxDepth);
        this.multiNote.map((element) => {
            superNote.list = superNote.list.concat(element.list);
        });
        return superNote.pickRandomItemFromList(listTitle);
    };

    getError(): string[] {
        let allError:string[] = [];
        this.multiNote.map((element) => {
            allError = allError.concat(element.getError());
        });
        return allError;
    };

    getWarning(): string[] {
        let allWarning:string[] = this.logs.get('warning');
        this.multiNote.map((element) => {
            allWarning = allWarning.concat(element.getWarning());
        });
        return allWarning;
    };

    get length(): number {
        return this.multiNote.length;
    };

};

interface LIRPSuggestionInterface {
    noteName: string;
    title: string;
    description: string;
}

class LIRPSuggestionList {
    list: LIRPSuggestionInterface[];

    constructor() {
        this.list = [];
    };

    push (element: LIRPSuggestionInterface): void {
        this.list.push(element);
    };

    filterByNoteName(noteName: string): LIRPSuggestionList {
        const filterList = new LIRPSuggestionList();
        this.list.map((element) => {
            if (element.noteName === noteName) {
                filterList.push(element);
            }
        });
        return filterList;
    };

    filter(callback: (element: LIRPSuggestionInterface, index?: number, array?: LIRPSuggestionInterface[]) => boolean): LIRPSuggestionList {
        const filteredList = new LIRPSuggestionList();
        for (let i = 0; i < this.list.length; i++) {
            if (callback(this.list[i], i, this.list)) {
                filteredList.push(this.list[i]);
            }
        }
        return filteredList;
    };

    concat(otherList: LIRPSuggestionList): LIRPSuggestionList {
        const newList = new LIRPSuggestionList();
        newList.list = this.list.concat(otherList.list);
        return newList;
    };

    get length (): number {
        return this.list.length;
    }
}

export class LIRPSuggestModal extends SuggestModal<LIRPSuggestionInterface> {
    items: LIRPSuggestionList;
    callback: (value: LIRPSuggestionInterface) => void;
  
    constructor(app: App, items: LIRPSuggestionList, callback: (value: LIRPSuggestionInterface) => void) {
      super(app);
      this.items = items;
      this.callback = callback;
    }

    getSuggestions(query: string): LIRPSuggestionInterface[] {
        return this.items.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
        ).list; // Retourne le tableau `list` de LIRPSuggestionList
    }

    renderSuggestion(item: LIRPSuggestionInterface, el: HTMLElement) {
        el.createEl('div', { text: item.title });
        let message:string = item.description
        // if (item.noteName !== item.title) {
        //     if (item.description !== '') {
        //         message = `${item.description}\n(from : ${item.noteName})`;
        //     } else {
        //         message = `(from : ${item.noteName})`;
        //     }
        // };
        el.createEl('small', {text: message});
      }
  
      onChooseSuggestion(item: LIRPSuggestionInterface, evt: MouseEvent | KeyboardEvent) {
        this.callback(item);
      }}

export default class ListItemRandomPicker extends Plugin {
    settings: LIRPPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('list-tree', 'Pick random list item', (evt: MouseEvent) => {
            this.doTheJob('note');
        });

        this.addCommand({
            id: 'insert-random-item',
            name: 'Insert random item from list',
            callback: () => {
                this.doTheJob('note');
            }
        });

        this.addCommand({
            id: 'insert-setting-item',
            name: 'Insert list settings values',
            callback: () => {
                this.insertString(LIRPList.getSettingString());
            }
        });

        this.addCommand({
            id: 'insert-reference-item',
            name: 'Insert list reference',
            callback: () => {
                this.doTheJob('reference');
            }
        });

        this.addSettingTab(new LIRPSettingTab(this.app, this));
    }

    onunload() {

    }

    async doTheJob(action: string): Promise<void> {
        const allLIRPFiles = this.getLIRPFiles(this.settings.notePath);
        let currentLIRP = new LIRPMultiNote(this.settings.nullValue, this.settings.escapeValue, this.settings.maxMacroDepth);
        let loadWithoutError:boolean = true;

        for (const currentFile of allLIRPFiles) {
            const currentFSObject = this.app.vault.getAbstractFileByPath(currentFile);
            let content:string = '';
            if (currentFSObject instanceof TFile) {
                content = await this.app.vault.cachedRead(currentFSObject);
                loadWithoutError =  currentLIRP.loadFromNote(currentFSObject.path.slice(0, -3), content) && loadWithoutError;
            };                    
        };
        if (!loadWithoutError) {
            currentLIRP.getError().map((element) => {
                new Notice(element);
            });
            if (currentLIRP.length === 0) {
                return;
            }
        }
        if (this.settings.showWarning) {
            currentLIRP.getWarning().forEach(element => {
                new Notice(element);
            });
        };
        if (currentLIRP.length === 0) {
            new Notice('Error : check settings "Path " in plugin List Item Random Picker !');
            return;
        } else if (currentLIRP.length === 1) {
            new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(), (item) => {
                if (action === 'note') {
                    this.workWithTitle(currentLIRP, item.title);
                } else {
                    this.insertString(`{${item.title}}`);
                };
            }).open();
        } else {
            if (this.settings.showNoteSelector) {
                new LIRPSuggestModal(this.app, currentLIRP.getNoteSuggestion(), (item) => {
                    new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion().filterByNoteName(item.noteName), (item) => {
                        if (action === 'note') {
                            this.workWithTitle(currentLIRP, item.title);
                        } else {
                            this.insertString(`{${item.title}}`);
                        };
                    }).open();
                }).open();
            } else {
                new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(), (item) => {
                    if (action === 'note') {
                        this.workWithTitle(currentLIRP, item.title);
                    } else {
                        this.insertString(`{${item.title}}`);
                    };
            }).open();
            };
        };
    }

    getLIRPFiles (notePath: string): string[] {
        let allVaultFiles = this.app.vault.getFiles();
        let filesInNotePath:string[] = [];
        const notePathRegex = new RegExp(`^${notePath}(/.+)?\.md$`);
        allVaultFiles.map((element) => {
            if (notePathRegex.test(element.path)) {
                filesInNotePath.push(element.path);
            };
        });
        return filesInNotePath;
    };

    workWithTitle(Note: LIRPMultiNote, listTitle: string): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (activeView) {
            const selectionForNotificationRegex:string = `^${this.settings.selectionForNotification}$`;
            const noticeRegex = new RegExp(selectionForNotificationRegex);
    
            const editor = activeView.editor;
            const selection = editor.getSelection();

            if (noticeRegex.test(selection)) {
                new Notice(Note.pickRandomItemFromList(listTitle));
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
                        arrayStringToinsert.push(Note.pickRandomItemFromList(listTitle));
                    }
                    stringToInsert = arrayStringToinsert.join(delimiter);
                } else {
                    stringToInsert = Note.pickRandomItemFromList(listTitle);
                }
                editor.replaceSelection(stringToInsert);
            };
        } else {
            new Notice("No active Markdown editor found.");
        };
    };

    insertString(stringToInsert: string) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            activeView.editor.replaceSelection(stringToInsert);
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