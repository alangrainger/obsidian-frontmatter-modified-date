import { FuzzySuggestModal } from "obsidian";

export class LabeledSuggestModal extends FuzzySuggestModal<string> {
    private promise: Promise<any>;
    private resolvedPromise: (value: any) => void;

    public static open(arrayToReturn: any[], stringArrayToDisplay: string[], placeholderString?: string) {
        // console.debug("open(",arrayToReturn,",",stringArrayToDisplay,",",placeholderString,") was called.");
        const modalToSpawn = new LabeledSuggestModal(arrayToReturn, stringArrayToDisplay, placeholderString);
        return modalToSpawn.promise;
    }

    constructor(private arrayToReturn: any[], private stringArrayToDisplay: string[], private placeholderString?: string) {
        // console.debug("constructor(",arrayToReturn,",",stringArrayToDisplay,",",placeholderString,") was called.");
        super(app);
        this.promise = new Promise<any>(
            (resolve) => (this.resolvedPromise = resolve)
        );
        
        if (placeholderString != undefined){
            this.setPlaceholder(placeholderString);
        }
        
        this.open();
    }
    
   getItems(): any[] {
        // console.debug("getItems() was called.");
        return this.arrayToReturn;
    }

    getItemText(currentObject: any): string {
        // console.debug("getItemText(",currentObject, ") was called.");
        return this.stringArrayToDisplay[this.arrayToReturn.indexOf(currentObject)];
    }

    onChooseItem(chosenObject: any, evt: MouseEvent | KeyboardEvent): void {
        // console.debug("onChooseItem(",chosenObject,") was called.");
        this.resolvedPromise(chosenObject);
    }

}