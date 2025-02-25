import { App, Modal, SuggestModal, Notice, Plugin, PluginSettingTab, Setting, TFile, MarkdownView } from 'obsidian';

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
    items: string[];
    pickRandomItem(): string;
}

class LIRPList implements LIRPListInterface {
    title: string;
    description: string;
    hidden: boolean;
    items: string[];

    constructor(multiLineString: string) {
        // Work to do
    }

    pickRandomItem(): string {
        return "toto"
    }

}
interface LIRPNoteInterface {
    fullPath: string;
    description: string;
    list: LIRPList[];
    loadFromNote(noteFullPath: string): boolean;
    getListSuggestion(): LIRPSuggestionInterface[];
    pickRandomItemFromListlist(listTitle: string): string; 
}

class LIRPNote implements LIRPNoteInterface {
    fullPath: string;
    description: string;
    list: LIRPList[];

    constructor () {
        this.fullPath = "";
        this.description = "";
        this.list = [];
    }

    loadFromNote(noteFullPath: string): boolean {
        return true
    }

    getListSuggestion(): LIRPSuggestionInterface[] {
        const exemple = {
            title: "toto",
            description: ""
        };
        const array = [exemple];
        return array;
    }

    pickRandomItemFromListlist(listTitle: string): string {
        return "toto"
    } 

}
interface LIRPSuggestionInterface {
    title: string;
    description: string;
}


export class MySuggestModal extends SuggestModal<LIRPSuggestionInterface> {
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
      }
  
      onChooseSuggestion(item: LIRPSuggestionInterface, evt: MouseEvent | KeyboardEvent) {
        this.callback(item.title);
      }}  

class ItemPickerModal extends Modal {
    items: string[];
    callback: (item: string) => void;

    constructor(app: App, items: string[], callback: (item: string) => void) {
        super(app);
        this.items = items;
        this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;

        // Configuration du conteneur Flexbox
        contentEl.style.display = 'flex';
        contentEl.style.flexDirection = 'column';
        contentEl.style.height = '100%'; // Assurez-vous que le conteneur prend toute la hauteur

        // Conteneur pour le sélecteur (prendra l'espace restant)
        const selectContainer = contentEl.createDiv();
        selectContainer.style.flexGrow = '1'; // Prend l'espace disponible
        selectContainer.style.display = 'flex';
        selectContainer.style.flexDirection = 'column';
        selectContainer.style.justifyContent = 'center'; // Centre verticalement le select
        selectContainer.style.alignItems = 'center'; // Centre horizontalement le select

        const itemSelect = selectContainer.createEl('select');
        this.items.forEach(item => {
            itemSelect.createEl('option', { value: item, text: item });
        });

        // Conteneur pour le bouton (en bas, centré)
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center'; // Centre horizontalement le bouton
        buttonContainer.style.padding = '10px 0'; // Ajoute un peu d'espace autour du bouton

        const okButton = buttonContainer.createEl('button', { text: 'OK' });
        okButton.addEventListener('click', () => {
            const selectedItem = itemSelect.value;
            this.close();
            this.callback(selectedItem);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class ListItemRandomPicker extends Plugin {
    settings: LIRPPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('list-tree', 'Pick random list item', (evt: MouseEvent) => {
            this.openTitlePicker(this.settings.notePath);
        });

        this.addSettingTab(new LIRPSettingTab(this.app, this));
    }

    onunload() {

    }

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
        new MySuggestModal(this.app, this.transformerEnSuggestions(titles), (title) => {
            this.insertRandomEntry(content, title);
        }).open();
        

        // new ItemPickerModal(this.app, titles, (title) => {
        //     this.insertRandomEntry(content, title);
        // }).open();
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