import { App, SuggestModal, Notice, Plugin, PluginSettingTab, Setting, TFile, MarkdownView} from 'obsidian';

//-----------------------------------------------------------------

function findIndexes<T>(anArray: T[], predicate: (element: T, index: number) => boolean): number[] {
    const indexes: number[] = [];
    anArray.forEach((element, index) => {
      if (predicate(element, index)) {
        indexes.push(index);
      }
    });
    return indexes;
};

function indexIsBetweenFindIndexes(index: number, indexes: number[], lastCouldBeOpen:boolean = false): boolean {
    let isBeetween:boolean = false;
    if (lastCouldBeOpen) {
        if ((indexes.length % 2 !== 0) && (index >= indexes[indexes.length - 1])) {
            return true;
        };
    };
    for (let i=0; i < (indexes.length - 2); i = i +2) {
        if ((indexes[i] <= index) && (index <= indexes[i+1])) {
            return true;
        }
    }
    return isBeetween;
};

function escapeRegex(stringToEscape: string): string {
    return stringToEscape.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

type LIRPLogStatus = 'dupInNote' | 'dupInFolder' | 'emptyList' | 'emptyNote' | 'refLimit' | 'subRefLimit' | 'pathSetting' | 'folderAndFile' | 'showItem' | 'noActiveView';
type LIRPLogType = 'error' | 'warning' | 'info';

const LIRPLogStatusValues: LIRPLogStatus[] = [
    'dupInNote',
    'dupInFolder',
    'emptyList',
    'emptyNote',
    'refLimit',
    'subRefLimit',
    'pathSetting',
    'folderAndFile',
    'showItem',
    'noActiveView',
];

class LIRPLogElement {
    father: string;
    child: string;
    status: LIRPLogStatus;
    complement: string;

    static getErrorStatus(): string[] {
        return ['dupInFolder','pathSetting'];
    };

    static getWarningStatus(): string[] {
        let warningStatus:string[] = [];
        LIRPLogStatusValues.map((element) => {
            if (!LIRPLogElement.getErrorStatus().contains(element) && !LIRPLogElement.getWarningStatus().contains(element)) {
                warningStatus.push(element);
            };
        });
        return warningStatus;
    };

    static getInfoStatus(): string[] {
        return ['showItem','refLimit','subRefLimit'];
    };

    getType(): LIRPLogType {
        const errors: string[] = ['pathSetting', 'dupInFolder'];
        if (errors.contains(this.status)) {
            return 'error'
        } else {
            return 'warning'
        };
    };

    constructor (father: string, child: string, status: LIRPLogStatus, complement: string = '') {
        this.father = father;
        this.child = child;
        this.status = status;
        this.complement = complement;
    };

    toString(): string {
        return `${this.getType()} / ${this.father} / ${this.child} / ${this.status} / ${this.complement}`;
    };
};

class LIRPLog {
    logs: LIRPLogElement[];

    constructor() {
        this.logs = [];
    };
    
    push(father: string, child: string, status: LIRPLogStatus, complement: string = ''): void {
        this.logs.push(new LIRPLogElement(father, child, status, complement));
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
    };

    flush(): void {
        this.logs = [];
    };

};

//-----------------------------------------------------------------

interface LIRPListInterface {
    title: string;
    description: string;
    items: string[];
    getSuggestion(noteName: string): LIRPSuggestionInterface;
    flushLogs(): void;
    notHidden(): boolean;
    pickRandomItem(): string;
    getLogs(): LIRPLog;
};

class LIRPList implements LIRPListInterface {
    title: string;
    description: string;
    hidden: boolean;
    items: string[];
    logs: LIRPLog;
    nullValue: string;
    escapeString: string;
    commentString: string;

    static getSettingString(value: '' | 'hide' | 'hide_string' | 'hide_ticked' = ''): string {
        if (value === '') {
            return '- [ ] Hide this list\n'
        } else {
            switch (value) {
                case 'hide':
                    return '^\- \\[[x \\?]\\] Hide this list$';
                case 'hide_string':
                    return '\- \\[[x ?]\\] Hide this list';
                case 'hide_ticked':
                    return '^\- \\[[x?]\\] Hide this list$';
            };
        };
    };

    constructor(noteName: string, lines: string[], nullValue: string, escapeString: string, commentString: string) {
        this.title = "";
        this.description = "";
        this.hidden = false;
        this.items = [];
        this.logs = new LIRPLog();
        this.nullValue = nullValue;
        this.escapeString = escapeString;
        this.commentString = commentString;

        const headingRegEx = /^# +(.+)$/;
        this.title = lines[0].replace(headingRegEx, "$1");
        lines.shift();
        const listBeginItemString = `^(?!${LIRPList.getSettingString('hide_string')}) {0,3}(-|\\d+\.|\\*) +(.+)$`;
        const listBeginItemRegex = new RegExp(listBeginItemString);
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
    };

    flushLogs(): void {
        this.logs.flush()
    };

    pushItemBasedOnWeight(item: string[]): void {
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
        const escapeStringRegex = `^ *${this.escapeString}(.*)`;
        const escapeStringRegEx = new RegExp(escapeStringRegex, 'gm');
        const escapeItem = item.map((element) => {
            return element.replace(escapeStringRegEx, '$1');
        });
        let stringItem = escapeItem.join('\n');
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
    };

    pickRandomItem(): string {
        let randomItem: string = "";
        if (this.items.length > 0) {
            randomItem = this.items[Math.floor(Math.random() * this.items.length)];
        }
        return randomItem;
    };

    getLogs(): LIRPLog {
        return this.logs;
    };

    get length(): number {
        return this.items.length;
    };

};

//-----------------------------------------------------------------

interface LIRPDoRefSubInterface {
    lastListTitle: string;
    modifiedText: string;
};

//-----------------------------------------------------------------

interface LIRPNoteInterface {
    loadFromNote(noteName: string, noteContent: string): boolean;
    getListSuggestion(): LIRPSuggestionList;
    pickRandomItemFromList(listTitle: string, workOnReference: boolean): string; 
    getLogs(): LIRPLog;
    getListTitles() : string[];
    flushLogs(): void;
};

class LIRPNote implements LIRPNoteInterface {
    noteName: string;
    description: string;
    list: LIRPList[];
    logs: LIRPLog;
    nullValue: string;
    escapeString: string;
    commentString: string;
    rollDice: boolean;
    keepComment: boolean;
    referenceMaxDepth: number;

    static getSettingString(value: '' | 'deleteComment' | 'deleteComment_ticked' = ''): string {
        if (value === '') {
            return '- [ ] Do not preserve comments\n'
        } else {
            switch (value) {
                case 'deleteComment':
                    return '^\- \\[[x ?]\\] Do not preserve comments$';
                case 'deleteComment_ticked':
                    return '^\- \\[[x?]\\] Do not preserve comments$';
            };
        };
    };

    constructor (nullValue: string, escapeString: string, commentString: string, referenceMaxDepth: number) {
        this.noteName = "";
        this.description = "";
        this.list = [];
        this.logs = new LIRPLog();
        this.nullValue = nullValue;
        this.escapeString = escapeString;
        this.commentString = commentString;
        this.rollDice = true;
        this.referenceMaxDepth = referenceMaxDepth;
        this.keepComment = true;
    };

    getListTitles() : string[] {
        let listTitles:string[] = [];
        this.list.map((element) => {
            listTitles.push(element.title);
        });
        return listTitles;
    };

    workWithComment (text: string): string {
        // let's define some regex
        const tickSettingRegEx = new RegExp(LIRPNote.getSettingString('deleteComment_ticked'));
        const headingRegex = /^# .+$/;
        const commentLineString = `^${this.commentString}$`;
        const commentLineRegex = new RegExp(commentLineString);
        const commentBlock = `${this.commentString}.*?${this.commentString}`;
        const commentBlockRegex = new RegExp(commentBlock);
        // let's find settings
        const lines = text.split('\n');
        const settingIndex = findIndexes(lines,(element) => tickSettingRegEx.test(element));
        const commentLineIndex = findIndexes(lines,(element) => commentLineRegex.test(element));
        const headingIndex = findIndexes(lines,(element) => headingRegex.test(element));
        // si pas de titre on touche à rien
        if (headingIndex.length === 0) {
            return text;
        };
        if ((settingIndex.length === 0) || (settingIndex[0] > headingIndex[0])) {
            // si pas de settings ou settings après le premier titre 1
            this.keepComment = true;
        } else {
            // intégrer indexBetweenFindIndexes
            this.keepComment = indexIsBetweenFindIndexes(settingIndex[0],commentLineIndex)
            // sinon keepinde
        }
        let insideComment = false;
        const newLines:string[] = [];
        lines.map((element) => {
            let isACommentLine = false;
            if (commentLineRegex.test(element)) {
                insideComment = !insideComment;
                isACommentLine = true;
            }
            if (insideComment || isACommentLine) {
                if (this.keepComment) {
                    newLines.push(this.escapeString + element);
                };
            } else {
                if (this.keepComment) {
                    newLines.push(element);
                } else {
                    newLines.push(element.replace(commentBlockRegex,''));
                };
            };
        });
        return newLines.join('\n');
    };

    loadFromNote(noteName: string, noteContent: string, ): boolean {
        this.noteName = noteName;
        let lines:string[] = [];
        lines = this.workWithComment(noteContent).split('\n');
        if (lines[0] === '') {
            // taking care of MD022
            // Drop the first line of the note if it's an empty one,
            // because technically Note title is a heading one
            lines.shift();
        };
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
            let mdDescription = lines.slice(0, headingIndexes[0]);
            const deleteRegex = new RegExp (LIRPNote.getSettingString('deleteComment'));
            mdDescription = mdDescription.filter((element) => !(deleteRegex.test(element)));
            this.description = mdDescription.join('\n');
        }
        const headingCount = headingIndexes.length;
        let pushSuccess:boolean = true;
        for (let currentIndex = 0; currentIndex < (headingCount - 1); currentIndex++) {
                pushSuccess = this.pushListIfNotExists(new LIRPList(this.noteName, lines.slice(headingIndexes[currentIndex], headingIndexes[currentIndex + 1]), this.nullValue, this.escapeString, this.commentString)) && pushSuccess;
        };
         pushSuccess = this.pushListIfNotExists(new LIRPList(this.noteName, lines.slice(headingIndexes[headingCount - 1]), this.nullValue, this.escapeString, this.commentString)) && pushSuccess;
         return pushSuccess;
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
    };

    doReferenceSubstitution(text: string): LIRPDoRefSubInterface {
        let match;
        let modifiedText:string = text;
        let listTitle:string = "";
        const stringRefRegex: string = `\{(${this.list.map((element) => escapeRegex(element.title)).join('|')})\}`;
        for (let repeat = 0; repeat < this.referenceMaxDepth; repeat++) {
            const refRegex = new RegExp (stringRefRegex,'mg');
            while ((match = refRegex.exec(modifiedText)) !== null) {
                let newValue: string = this.pickRandomItemFromList(match[1], false); 
                listTitle = match[0];
                modifiedText = modifiedText.replace(listTitle, newValue);
                refRegex.lastIndex = match.index + newValue.length;
            };
        };
        if (this.rollDice) {
            const diceRoller = new DiceRoller();
            modifiedText = diceRoller.replaceDiceRolls(modifiedText,'{','}');
        };

        return {
            lastListTitle: listTitle,
            modifiedText: modifiedText,
        };
    };

    flushLogs(): void {
        this.logs.flush();
        this.list.map((element) => {
            element.flushLogs();
        });
    };

    pickRandomItemFromList(listTitle: string, workOnReference: boolean = true): string {
        let randomItem: string = "";
        let returnOfDoExecSub: LIRPDoRefSubInterface = {
            lastListTitle: listTitle,
            modifiedText: "",
        };
        const currentList = this.list.find((element) => element.title === listTitle);
        if (currentList !== undefined) {
            randomItem = currentList.pickRandomItem();
            if (workOnReference) {
                returnOfDoExecSub = this.doReferenceSubstitution(randomItem);
                randomItem = returnOfDoExecSub.modifiedText;
                const stringRefRegex: string = `\{(${this.list.map((element) => escapeRegex(element.title)).join('|')})\}`;
                const RefRegex = new RegExp (stringRefRegex);
                if (RefRegex.test(randomItem) && workOnReference) {
                    if (returnOfDoExecSub.lastListTitle === '') {
                        returnOfDoExecSub.lastListTitle = listTitle;
                    }
                    this.logs.push(this.noteName, returnOfDoExecSub.lastListTitle, 'refLimit');
                };
            };
            return randomItem;
        } else {
            return "";
        };
    };

    getLogs(): LIRPLog {
        let allLogs = new LIRPLog;
        allLogs.add(this.logs);
        this.list.map((element) => {
            allLogs.add(element.getLogs());
        });
        return allLogs;
    };

    get length(): number {
        return this.list.length;
    };
};

class LIRPMultiNote implements LIRPNoteInterface {
    multiNote: LIRPNote[];
    nullValue: string;
    escapeString: string;
    commentString: string;
    referenceMaxDepth: number;
    logs: LIRPLog;

    constructor (nullValue: string, escapeString: string, commentString: string, referenceMaxDepth: number) {
        this.multiNote = [];
        this.nullValue = nullValue;
        this.escapeString = escapeString;
        this.commentString = commentString;
        this.referenceMaxDepth = referenceMaxDepth;
        this.logs = new LIRPLog();
    };

    loadFromNote(noteName: string, noteContent: string): boolean {
        const currentNote = new LIRPNote(this.nullValue, this.escapeString, this.commentString, this.referenceMaxDepth);
        let status = currentNote.loadFromNote(noteName, noteContent);
        status = this.pushNoteIfListNotExists(currentNote) && status;
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
            allListSuggestion = allListSuggestion.concat(element.getListSuggestion(withHidden));
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

    doReferenceSubstitution(text: string):string {
        let superNote = new LIRPNote(this.nullValue, this.escapeString, this.commentString, this.referenceMaxDepth);
        this.multiNote.map((element) => {
            superNote.list = superNote.list.concat(element.list);
        });
        let returnOfDoExecSub: LIRPDoRefSubInterface = {
            lastListTitle: 'Reference substitution in selection',
            modifiedText: "",
        };
        returnOfDoExecSub = superNote.doReferenceSubstitution(text);
        let listTitle:string = "";
        const stringRefRegex: string = `\{(${superNote.list.map((element) => escapeRegex(element.title)).join('|')})\}`;
        const refRegex = new RegExp(stringRefRegex);
        if (refRegex.test(returnOfDoExecSub.modifiedText)) {
            this.logs.push('', '', 'subRefLimit');
        };
        return returnOfDoExecSub.modifiedText
    };

    pickRandomItemFromList(listTitle: string, workOnReference: boolean = true): string {
        let superNote = new LIRPNote(this.nullValue, this.escapeString, this.commentString, this.referenceMaxDepth);
        superNote.noteName = this.getNoteNameFromListTitle(listTitle);
        this.multiNote.map((element) => {
            superNote.list = superNote.list.concat(element.list);
        });
        const randomItem: string = superNote.pickRandomItemFromList(listTitle);
        this.logs.add(superNote.getLogs());
        return randomItem;
    };

    flushLogs(): void {
        this.logs.flush();
        this.multiNote.map((element) => {
            element.flushLogs()
        });
    };

    getLogs(): LIRPLog {
        let allLogs = new LIRPLog;
        allLogs.add(this.logs);
        this.multiNote.map((element) => {
            allLogs.add(element.getLogs());
        });
        return allLogs;
    };

    hasErrors(): boolean {
        const allLogs = this.getLogs();
        return (allLogs.get('error').length !== 0) ;
    };

    get length(): number {
        return this.multiNote.length;
    };

};

//-----------------------------------------------------------------

interface LIRPSuggestionInterface {
    noteName: string;
    title: string;
    description: string;
};

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
            };
        };
        return filteredList;
    };

    concat(otherList: LIRPSuggestionList): LIRPSuggestionList {
        const newList = new LIRPSuggestionList();
        newList.list = this.list.concat(otherList.list);
        return newList;
    };

    get length (): number {
        return this.list.length;
    };
}

//-----------------------------------------------------------------

export class LIRPSuggestModal extends SuggestModal<LIRPSuggestionInterface> {
    items: LIRPSuggestionList;
    callback: (value: LIRPSuggestionInterface) => void;
  
    constructor(app: App, items: LIRPSuggestionList, callback: (value: LIRPSuggestionInterface) => void) {
      super(app);
      this.items = items;
      this.callback = callback;
    };

    getSuggestions(query: string): LIRPSuggestionInterface[] {
        return this.items.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
        ).list;
    };

    renderSuggestion(item: LIRPSuggestionInterface, el: HTMLElement) {
        el.createEl('div', { text: item.title });
        let message:string = item.description
        // CHOICE TO DO : Display note path and name when no note selector ?
        // if (item.noteName !== item.title) {
        //     if (item.description !== '') {
        //         message = `${item.description}\n(from : ${item.noteName})`;
        //     } else {
        //         message = `(from : ${item.noteName})`;
        //     }
        // };
        el.createEl('small', {text: message});
      };
  
      onChooseSuggestion(item: LIRPSuggestionInterface, evt: MouseEvent | KeyboardEvent) {
        this.callback(item);
      };
};

//-----------------------------------------------------------------

interface LIRPPluginSettings {
    notePath: string;
    nullValue: string;
    escapeValue: string;
    selectionForNotification: string;
    showNoteSelector: boolean;
    showWarning: boolean;
    deleteSelectionForNotification: boolean;
    maxReferenceDepth: number;
    commentValue: string;
};

const DEFAULT_SETTINGS: LIRPPluginSettings = {
    notePath: 'Note or folder path',
    nullValue: 'null',
    escapeValue: '//',
    selectionForNotification: '!',
    showNoteSelector: true,
    showWarning: true,
    deleteSelectionForNotification: false,
    maxReferenceDepth: 3,
    commentValue: '%%',
};

export default class ListItemRandomPicker extends Plugin {
    settings: LIRPPluginSettings;
    logs: LIRPLog;

    async onload() {
        await this.loadSettings();
        this.logs = new LIRPLog();
        this.addRibbonIcon('list-tree', 'Pick random list item', (evt: MouseEvent) => {
            this.prepareAction('note');
        });

        this.addCommand({
            id: 'insert-random-item',
            name: 'Insert random item from list',
            callback: () => {
                this.prepareAction('note');
            }
        });

        this.addCommand({
            id: 'insert-list-setting-item',
            name: 'Insert list settings values',
            callback: () => {
                this.insertString(LIRPList.getSettingString());
            }
        });

        this.addCommand({
            id: 'insert-note-setting-item',
            name: 'Insert note settings values',
            callback: () => {
                this.insertString(LIRPNote.getSettingString());
            }
        });

        this.addCommand({
            id: 'insert-reference-item',
            name: 'Insert list reference',
            callback: () => {
                this.prepareAction('reference');
            }
        });

        this.addCommand({
            id: 'replace-reference-item',
            name: 'Replace references in selection',
            callback: () => {
                this.prepareAction('doRefSubstitution');
            }
        });

        this.addSettingTab(new LIRPSettingTab(this.app, this));
    };

    onunload() {
    };

    getLIRPFiles (notePath: string): string[] {
        let allVaultFiles = this.app.vault.getMarkdownFiles();
        let filesInNotePath:string[] = [];
        let foundAFile: boolean = false;
        const noteFileName: string = `${notePath}.md`
        const notePathRegex = new RegExp(`^${notePath}/.+\.md$`);
        allVaultFiles.map((element) => {
            if (notePathRegex.test(element.path)) {
                filesInNotePath.push(element.path);
            } else if (element.path === noteFileName) {
                foundAFile = true;
            };
        });
        if (filesInNotePath.length === 0 && foundAFile) {
            filesInNotePath.push(noteFileName);
        } else if (foundAFile && filesInNotePath.length !== 0) {
            this.logs.push('ListItemRandmPicker','getLIRPFiles','folderAndFile')
        }
        return filesInNotePath;
    };

    async loadLIRPFiles(): Promise<LIRPMultiNote> {
        const allLIRPFiles = this.getLIRPFiles(this.settings.notePath);
        let currentLIRP = new LIRPMultiNote(this.settings.nullValue, this.settings.escapeValue, this.settings.commentValue, this.settings.maxReferenceDepth);

        for (const currentFile of allLIRPFiles) {
            const currentFSObject = this.app.vault.getAbstractFileByPath(currentFile);
            let content:string = '';
            if (currentFSObject instanceof TFile) {
                content = await this.app.vault.cachedRead(currentFSObject);
                currentLIRP.loadFromNote(currentFSObject.path.slice(0, -3), content);
            };                    
        };
        return currentLIRP;
    };

    async prepareAction(action: string): Promise<void> {
        const currentLIRP = await this.loadLIRPFiles();
        if (currentLIRP.length === 0) {
            this.logs.push('ListItemRandomPicker','loadLIRPFiles','pathSetting');
        };
        if (!currentLIRP.hasErrors() && currentLIRP.length !== 0) {
            if (action === 'doRefSubstitution') {
                this.doReferenceSubstitution(currentLIRP);
            } else {
                if (currentLIRP.length === 1 || !this.settings.showNoteSelector) {
                    new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(action === 'reference'), (item) => {
                        if (action === 'note') {
                            this.workWithTitle(currentLIRP, item.title);
                        } else {
                            this.insertString(`{${item.title}}`);
                        };
                    }).open();
                } else {
                    new LIRPSuggestModal(this.app, currentLIRP.getNoteSuggestion(action === 'reference'), (item) => {
                        new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(action === 'reference').filterByNoteName(item.noteName), (item) => {
                            if (action === 'note') {
                                this.workWithTitle(currentLIRP, item.title);
                            } else {
                                this.insertString(`{${item.title}}`);
                            };
                        }).open();
                    }).open();
                };
            };
        }
        this.doLogManagement(currentLIRP.getLogs());
        this.logs.flush();
        currentLIRP.flushLogs();
    };

    doLogManagement(multiNoteLogs?: LIRPLog): void {
        const allLogs = this.logs;
        if (multiNoteLogs !== undefined) {
            allLogs.add(multiNoteLogs);
            multiNoteLogs.flush();
        };
        const errorMsg: string[] = [];
        const warningMsg: string[] = [];
        const infoMsg: string[] = [];
        allLogs.logs.map((element) => {
            switch (element.status) {
                case 'dupInNote':
                    warningMsg.push(`List "${element.child}" is duplicate in note "${element.father}". List is ignored`);
                    break;
                case 'dupInFolder':
                    errorMsg.push(`ERROR : List "${element.child}" exists in two notes, "${element.father}" and "${element.complement}", make correction !`);
                    break;
                case 'emptyList':
                    warningMsg.push(`List "${element.child}" is empty in "${element.father}"`);
                    break;
                case 'emptyNote':
                    warningMsg.push(`"${element.child}" is empty`);
                    break;
                case 'refLimit':
                    warningMsg.push(`Reference depth limit reach with list "${element.child}" in note "${element.father}"`);
                    break;
                // case 'subRefLimit':
                //     warningMsg.push(`Reference depth limit reach`);
                //     break;
                case 'pathSetting':
                    errorMsg.push(`ERROR : verify path in plugin settings`);
                    break;
                case 'folderAndFile':
                    warningMsg.push(`A note with the same name as the folder in settings gets ignored.`);
                    break;
                case 'showItem':
                    infoMsg.push(`${element.complement}`);
                    break;
                case 'noActiveView':
                    warningMsg.push(`No note in edition mode to do this action`);
                    break;
            };
            errorMsg.map((element) => new Notice(element));
            if (this.settings.showWarning) {
                warningMsg.map((element) => new Notice(element));
            };
            infoMsg.map((element) => new Notice(element));
        });
        this.logs.flush();
    };

    workWithTitle(note: LIRPMultiNote, listTitle: string): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const selectionForNotificationRegex:string = `^${this.settings.selectionForNotification}$`;
            const noticeRegex = new RegExp(selectionForNotificationRegex);
            const selection = activeView.editor.getSelection();
            if (noticeRegex.test(selection)) {
                this.logs.push('','','showItem',note.pickRandomItemFromList(listTitle));
                if (this.settings.deleteSelectionForNotification) {
                    activeView.editor.replaceSelection('');
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
                        arrayStringToinsert.push(note.pickRandomItemFromList(listTitle));
                    }
                    stringToInsert = arrayStringToinsert.join(delimiter);
                } else {
                    stringToInsert = note.pickRandomItemFromList(listTitle);
                }
                activeView.editor.replaceSelection(stringToInsert);
            };
        } else {
            this.logs.push('ListItemRandomPicker','workWithTitle','noActiveView')
        };
        this.doLogManagement(note.getLogs());
    };

    doReferenceSubstitution(multiNote: LIRPMultiNote): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const selection = activeView.editor.getSelection();
            activeView.editor.replaceSelection(multiNote.doReferenceSubstitution(selection));
        } else {
            this.logs.push('ListItemRandomPicker','workWithTitle','noActiveView')
        };
    };

    insertString(stringToInsert: string): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            activeView.editor.replaceSelection(stringToInsert);
        } else {
            this.logs.push('ListItemRandomPicker','workWithTitle','noActiveView')
        };
        this.doLogManagement();
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
            .setName('Path')
            .setDesc('The path of a note or folder. Example: "Folder/Note" or "Folder".')
            .addText(text => text
                .setPlaceholder('Enter the path to your note')
                .setValue(this.plugin.settings.notePath)
                .onChange(async (value) => {
                    this.plugin.settings.notePath = value;
                    await this.plugin.saveSettings();
                })
            );

            new Setting(containerEl).setName('Specific values').setHeading();
    
            new Setting(containerEl)
                .setName("Null value")
                .setDesc("If the first line of a list item has this value, that line is ignored. This allows you to have probabilities of getting no result. Usage example: having, or not having, a particle in a noun.")
                .addText((text) => text
                    .setPlaceholder("Enter value")
                    .setValue(this.plugin.settings.nullValue)
                    .onChange(async (value) => {
                    this.plugin.settings.nullValue = value;
                    await this.plugin.saveSettings();
                    })
            );

            new Setting(containerEl)
                .setName("Escape value")
                .setDesc("To include heading one elements or first-level list items in your random list, escape them with these values. Exemple : // # Heading")
                .addText((text) => text
                    .setPlaceholder("Enter value")
                    .setValue(this.plugin.settings.escapeValue)
                    .onChange(async (value) => {
                        this.plugin.settings.escapeValue = value;
                        await this.plugin.saveSettings();
                })
            );

            new Setting(containerEl)
                .setName("Selection value for notification")
                .setDesc("If the selected text has this value, the item is not inserted; instead, a notification is shown.")
                .addText((text) => text
                    .setPlaceholder("Enter value")
                    .setValue(this.plugin.settings.selectionForNotification)
                    .onChange(async (value) => {
                    this.plugin.settings.selectionForNotification = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl).setName('Behavior').setHeading();

        new Setting(containerEl)
            .setName('Show note selector')
            .setDesc('If path is a folder containing at least two notes, a selector will allow you to choose the note; otherwise, all lists will be offered to you.')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.showNoteSelector);
                toggle.onChange(async (value) => {
                    this.plugin.settings.showNoteSelector = value;
                    await this.plugin.saveSettings();
                })
            });

        new Setting(containerEl)
            .setName('Show warning')
            .setDesc('Are warnings displayed as notifications ?')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.showWarning);
                toggle.onChange(async (value) => {
                    this.plugin.settings.showWarning = value;
                    await this.plugin.saveSettings();
                })
            });

        new Setting(containerEl)
            .setName('Delete selection value on notification')
            .setDesc('If this setting is on, the selected notification value is removed after it\'s used.')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.deleteSelectionForNotification);
                toggle.onChange(async (value) => {
                    this.plugin.settings.deleteSelectionForNotification = value;
                    await this.plugin.saveSettings();
                })
            });

        new Setting(containerEl)
            .setName('Reference depth limit')
            .setDesc('Reference recursion limit: the maximum number of nested reference calls allowed. Zero disables reference resolution.')
            .addSlider((slider) =>
                slider
                    .setValue(this.plugin.settings.maxReferenceDepth)
                    .setLimits(0, 10, 1)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                    this.plugin.settings.maxReferenceDepth = value;
                    await this.plugin.saveSettings();
                    })
            );

    }
}