import { get } from 'lodash';

export class Utilities {

    static convertDate(text: string): Date {
        return new Date(parseInt(text.replace(/[^\d]/g, ''), 10));
    }

    static flatten(row: any, path: string): string {
        const item: string[] | string = get(row, path);
        return item instanceof Array ? item.join(' ') : String(item);
    }

}
