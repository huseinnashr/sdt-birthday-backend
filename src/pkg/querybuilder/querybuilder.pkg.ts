
export class QueryBuilder {
  private sb: string[];
  private counter: number;
  private args: any[];

  constructor(baseQuery: string, ...data: any[]) {
    this.sb = [];
    this.counter = 0;
    this.args = [];
    this.addQuery(baseQuery, ...data);
  }

  addQuery(format: string, ...data: any[]) {
    this.add(format, ...data);
  }

  addString(str: string) {
    this.sb.push(str);
  }

  private add(format: string, ...data: any[]) {
    this.args.push(...data);

    for (let i = 0; i < data.length; i++) {
      this.counter++;
      format = format.replace("?", `$${this.counter}`);
    }

    this.sb.push(format);
  }

  getQuery(): string {
    return this.sb.join(" ");
  }

  getArgs(): any[] {
    return this.args;
  }
}