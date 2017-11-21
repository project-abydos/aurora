export class Utilities {

    static convertDate(text: string): Date {
        return new Date(parseInt(text.replace(/[^\d]/g, ''), 10));
    }

}
