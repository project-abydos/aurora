import { get, defaults } from 'lodash';
import * as moment from 'moment';
import { Moment, CalendarSpec } from 'moment';

export class Utilities {

    static convertDate(text: string): Date {
        return new Date(parseInt(text.replace(/[^\d]/g, ''), 10));
    }

    static parseJCN(jcn: string): Moment {
        return moment.utc(jcn.slice(0, 5), 'YYDDDD').local();
    }

    static flatten(row: any, path: string): string {
        const item: string[] | string = get(row, path);
        return item instanceof Array ? item.join('') : String(item);
    }

    static convertJobTimestamp(timestamp: string): Moment {
        return moment.utc(timestamp, 'YYDDDD HH:mm:ss').local();
    }

    static prettyTimeDiff(time: Moment, overrides: CalendarSpec = {}): string {

        const diffMap: CalendarSpec = defaults(overrides, {
            sameDay: '[Today at] HH:mm',
            nextDay: '[Tomorrow]',
            nextWeek: '[Next Week]',
            lastDay: '[Yesterday]',
            lastWeek: 'M-D-YYYY',
            sameElse: 'M-D-YYYY',
        });

        return time.calendar(undefined, diffMap);
    }
}
