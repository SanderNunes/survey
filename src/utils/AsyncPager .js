/**
 * AsyncPager class for handling pagination with SharePoint async iterators
 */
export class AsyncPager {
  constructor(iterable, pages = [], pagePointer = -1, isDone = false) {
    this.iterator = iterable[Symbol.asyncIterator]();
    this.pages = pages;
    this.pagePointer = pagePointer;
    this.isDone = isDone;
  }

  /**
   * Provides access to the current page of values
   */
  async current() {
    // we don't have any pages yet
    if (this.pagePointer < 0) {
      return this.next();
    }

    // return the current page
    return this.pages[this.pagePointer];
  }

  /**
   * Access the next page, either from the local cache or make a request to load it
   */
  async next() {
    // does the page exist?
    let page = this.pages[++this.pagePointer];

    if (typeof page === "undefined") {
      if (this.isDone) {
        // if we are already done make sure we don't make any more requests
        // and return the last page
        --this.pagePointer;
      } else {
        // get the next page of links
        const next = await this.iterator.next();

        if (next.done) {
          this.isDone = true;
        } else {
          this.pages.push(next.value);
        }
      }
    }

    return this.pages[this.pagePointer];
  }

  async prev() {
    // handle already at the start
    if (this.pagePointer < 1) {
      return this.pages[0];
    }

    // return the previous page moving our pointer
    return this.pages[--this.pagePointer];
  }

  get hasNext() {
    return !this.isDone || this.pagePointer < this.pages.length - 1;
  }

  get hasPrev() {
    return this.pagePointer > 0;
  }

  get currentPageNumber() {
    return this.pagePointer + 1;
  }

  // Reset the pager
  reset() {
    this.pagePointer = -1;
    this.pages = [];
    this.isDone = false;
  }
}