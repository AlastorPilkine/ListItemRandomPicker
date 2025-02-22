import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, Editor, MarkdownView } from 'obsidian';

interface MyPluginSettings {
    notePath: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    notePath: 'Example Note'
};

class TitlePickerModal extends Modal {
    titles: string[];
    callback: (title: string) => void;

    constructor(app: App, titles: string[], callback: (title: string) => void) {
        super(app);
        this.titles = titles;
        this.callback = callback;
    }

    onOpen() {
        const { contentEl } = this;

        const titleSelect = contentEl.createEl('select');
        this.titles.forEach(title => {
            titleSelect.createEl('option', { value: title, text: title });
        });

        contentEl.createEl('button', { text: 'OK' }).addEventListener('click', () => {
            const selectedTitle = titleSelect.value;
            this.close();
            this.callback(selectedTitle);
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class listItemRandomPicker extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('list-tree', 'Pick Random Entry', (evt: MouseEvent) => {
            this.openTitlePicker();
        });

        this.addSettingTab(new SampleSettingTab(this.app, this));
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async openTitlePicker() {
        const notePath = this.settings.notePath + '.md';
        const file = this.app.vault.getAbstractFileByPath(notePath);

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

        new TitlePickerModal(this.app, titles, (title) => {
            this.insertRandomEntry(notePath, title);
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

    async insertRandomEntry(notePath: string, title: string) {
        const file = this.app.vault.getAbstractFileByPath(notePath);

        if (!file) {
            new Notice('Note not found!');
            return;
        }

        if (!(file instanceof TFile)) {
            new Notice('Invalid file type. Expected a TFile.');
            return;
        }

        const content = await this.app.vault.read(file);
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

class SampleSettingTab extends PluginSettingTab {
    plugin: listItemRandomPicker;

    constructor(app: App, plugin: listItemRandomPicker) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Settings for My Awesome Plugin.' });

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