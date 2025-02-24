import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Editor, MarkdownView } from 'obsidian';

interface MyPluginSettings {
    notePath: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    notePath: 'Example Note'
};

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
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('list-tree', 'Pick Random Entry', (evt: MouseEvent) => {
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

        new ItemPickerModal(this.app, titles, (title) => {
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
        // const file = this.app.vault.getAbstractFileByPath(notePath);

        // if (!file) {
        //     new Notice('Note not found!');
        //     return;
        // }

        // if (!(file instanceof TFile)) {
        //     new Notice('Invalid file type. Expected a TFile.');
        //     return;
        // }

        // const content = await this.app.vault.read(file);
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
            const position = editor.getCursor();
            editor.replaceRange(randomEntry, position, position);

            // Déplacer le curseur à la fin de l'insertion
            const newPosition = { line: position.line, ch: position.ch + randomEntry.length };
            editor.setCursor(newPosition);
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
            const ItemWithNumberRegEx = /^\((\d+)\)\s+(.+)$/m;
            if ((currentEntrySplit = ItemWithNumberRegEx.exec(fullString)) !== null) {
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

        containerEl.createEl('h2', { text: 'Settings for List Item Random Picker.' });

        new Setting(containerEl)
            .setName('Note Path')
            .setDesc('Path to the note containing the entries.')
            .addText(text => text
                .setPlaceholder('Enter the path to your note')
                .setValue(this.plugin.settings.notePath)
                .onChange(async (value) => {
                    this.plugin.settings.notePath = value;
                    await this.plugin.saveSettings();
                }));
    }
}