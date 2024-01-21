import dedent from 'dedent';
import escapeStringRegExp from 'escape-string-regexp';
import { Table } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { Editor, MarkdownView, Notice, Plugin, requestUrl } from 'obsidian';
import { remark } from 'remark';
import remarkGFM from 'remark-gfm';
import { Root } from 'remark-gfm/lib';

class HanayamaHuzzle {
	constructor(
		public level: string,
		public index: string,
		public name: string,
		public imageLinks: string[],
		public status: string = ''
	) {}
}

export default class HanayamaHuzzlesTrackerPlugin extends Plugin {
	static #startMarker: string = '<!-- Hanayama Huzzles start -->';
	static #endMarker: string = '<!-- Hanayama Huzzles end -->';
	static #headers: string[] = ['Level', 'Index', 'Name', 'Picture', 'Status'];
	static #scrapeUrls: string[] = [
		'https://hanayama-toys.com/product-category/puzzles/huzzle/level-1-fun',
		'https://hanayama-toys.com/product-category/puzzles/huzzle/level-2-easy',
		'https://hanayama-toys.com/product-category/puzzles/huzzle/level-3-normal',
		'https://hanayama-toys.com/product-category/puzzles/huzzle/level-4-hard',
		'https://hanayama-toys.com/product-category/puzzles/huzzle/level-5-expert',
		'https://hanayama-toys.com/product-category/puzzles/huzzle/level-6-grand-master'
	]

	async onload() {
		this.addCommand({
			id: 'update-list',
			name: 'Update list',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const content: string = editor.getValue();

				this.#updatedListInContent(content).then( newContent => {
					editor.setValue(newContent);

					new Notice('List updated!');
				});
			}
		});
	}

	onunload() {}

	async #updatedListInContent(content: string): Promise<string> {
		const escapedStartMarker: string = escapeStringRegExp(HanayamaHuzzlesTrackerPlugin.#startMarker);
		const escapedEndMarker: string = escapeStringRegExp(HanayamaHuzzlesTrackerPlugin.#endMarker);

		const regex: RegExp = new RegExp(`${escapedStartMarker}(?<markdownList>.*?)${escapedEndMarker}`, 's');
		const match: RegExpMatchArray | null = content.match(regex);

		if (match != null && match.groups != null) {
			const markdownList: string = match.groups.markdownList;
			const currentHuzzles: HanayamaHuzzle[] = this.#markdownTableToHuzzles(markdownList);
			const updatedMarkdownList: string = await this.#updatedHuzzles(currentHuzzles);

			return content.replace(regex, updatedMarkdownList);
		} else {
			const updatedMarkdownList: string = await this.#updatedHuzzles([]);

			return dedent
				`${content}

				${updatedMarkdownList}`;
		}
	}

	async #updatedHuzzles(currentHuzzles: HanayamaHuzzle[]): Promise<string> {
		const indexedCurrentHuzzles = currentHuzzles.slice(1).reduce((map, huzzle) => {
			map[huzzle.name] = huzzle.status;

			return map;
		}, {} as {[key: string]: string});

		const huzzles = (await this.#scrapeAllHuzzles()).flat();
		huzzles.forEach( huzzle => {
			huzzle.status = indexedCurrentHuzzles[huzzle.name] || '';
		});

		const updatedList: string = this.#huzzlesToMarkdownTableString(HanayamaHuzzlesTrackerPlugin.#headers, huzzles);

		return dedent
			`${HanayamaHuzzlesTrackerPlugin.#startMarker}

			${updatedList}

			${HanayamaHuzzlesTrackerPlugin.#endMarker}`;
	}

	async #scrapeAllHuzzles(): Promise<HanayamaHuzzle[][]> {
		return await Promise.all(HanayamaHuzzlesTrackerPlugin.#scrapeUrls.flatMap(async url => {
			return await this.#scrapeHuzzles(url);
		}));
	}

	async #scrapeHuzzles(url: string): Promise<HanayamaHuzzle[]> {
		const response = await requestUrl(url);

		const container = document.createElement('template');
		container.innerHTML = response.text;

		const content = container.content;
		const products = Array.from(content.querySelectorAll('#main>.products>.product'));
		const metadataRegex: RegExp = new RegExp(/(?<=\w+[ ])(?<level>\d+)-(?<index>\d+)[ ](?<name>.+)/); // https://regex101.com/r/1vGzHd/1

		return products.flatMap(product => {
			const title = product.querySelector('.product-info>.product-title>a')?.textContent || '';
			const titleMatch: RegExpMatchArray | null = title.match(metadataRegex);

			if (titleMatch == null || titleMatch.groups == null) {
				return [];
			}

			const level = titleMatch.groups.level;
			const index = titleMatch.groups.index;
			const name = titleMatch.groups.name;

			const images = product.querySelectorAll('.product-thumb>a>img');
			const imageLinks = Array.from(images, image => (image as HTMLImageElement).src);

			return new HanayamaHuzzle(level, index, name, imageLinks);
		});
	}

	#huzzlesToMarkdownTableString(headers: string[], huzzles: HanayamaHuzzle[]): string {
		const headerRow = {
			type: 'tableRow',
			children: headers.map(header => ({
				type: 'tableCell',
				children: [{
					type: 'text',
					value: header
				}]
			}))
		};
		const huzzleRows = huzzles.map(huzzle => ({
			type: 'tableRow',
			children: [{
				type: 'tableCell',
				children: [{
					type: 'text',
					value: huzzle.level
				}]
			}, {
				type: 'tableCell',
				children: [{
					type: 'text',
					value: huzzle.index
				}]
			}, {
				type: 'tableCell',
				children: [{
					type: 'text',
					value: huzzle.name
				}]
			}, {
				type: 'tableCell',
				children: [{
					type: 'image',
					alt: '|100',
					url: huzzle.imageLinks[0]
				}, {
					type: 'text',
					value: ' '
				}, {
					type: 'image',
					alt: '|100',
					url: huzzle.imageLinks[1]
				}]
			}, {
				type: 'tableCell',
				children: [{
					type: 'text',
					value: huzzle.status
				}]
			}]
		}));
		const tableRows = [
			...[headerRow],
			...huzzleRows
		]
		const table: Table = {
			type: 'table',
			children: tableRows as any // https://stackoverflow.com/a/47219058/865175
		};
		const root: Root = {
			type: 'root',
			children: [table]
		};

		return remark()
			.use(remarkGFM)
			.stringify(root)
			.replace(/\n$/, '');
	}

	#markdownTableToHuzzles(markdownTableString: string): HanayamaHuzzle[] {
		const ast = remark()
			.use(remarkGFM)
			.parse(markdownTableString);
		const table: Table = ast.children.find(node => node.type === 'table') as Table;
		const arrayOfArrays = table.children.map(row =>
			row.children.map(cell =>
				cell.children.map(child => {
					switch (child.type) {
						case 'image': return `![${child.alt}](${child.url})`
						default: return toString(child)
					}
				}).join('')
			)
		);
		const imageLinksRegex: RegExp = new RegExp(/(?<=!\[[^\]]+\]\()(?<link>[^)]+)(?=\))/g); // https://regex101.com/r/YlCOgc/1

		return arrayOfArrays.flatMap(array => {
			if (array.length < 5) {
				return [];
			}

			const level = array[0];
			const index = array[1];
			const name = array[2];

			const images = array[3];
			const imageLinkMatches = images.matchAll(imageLinksRegex);
			const imageLinks = Array.from(imageLinkMatches).flatMap(match => {
				if (match == null || match.groups == null) {
					return [];
				}

				return match.groups.link;
			});

			const status = array[4];

			return new HanayamaHuzzle(level, index, name, imageLinks, status);
		});
	}
}
