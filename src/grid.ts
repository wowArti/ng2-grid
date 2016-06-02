import { Component, Input, OnInit } from '@angular/core';
import { Http, HTTP_PROVIDERS, Response } from '@angular/http';
import { GridOptions } from './grid-options';
import { GridColumn } from './grid-column';
import { GridDataProvider } from './grid-data-provider';
import { GridSort } from './grid-sort';
import * as _ from 'lodash';
import 'rxjs/Rx';

/**
 * Data grid component class.
 * Use as directive. Component configuration is done through the options property.
 * Supports sorting, filtering and paging.
 *
 * @author Branimir Borisov <branimir@raketasoft.com>
 * @since 1.0.0-alpha
 */
@Component({
  selector: 'ng-grid',
  moduleId: module.id,
  templateUrl: './grid.html',
  styleUrls: ['./assets/ng2-grid.css'],
  providers: [HTTP_PROVIDERS]
})
export class Grid implements OnInit {
  @Input() options: GridOptions;

  private columns: Array<GridColumn> = [];
  private dataProvider: GridDataProvider;
  private data: Array<any>;
  private http: Http;
  private pageIndex: number = 1;
  private pages: Array<number>;

  /**
   * Class constructor.
   */
  constructor(http: Http) {
    this.http = http;
  }

  /**
   * Init properties and render data after component initialization.
   */
  ngOnInit() {
    if (_.isUndefined(this.options)) {
      this.options = new GridOptions();
    }
    if (!_.isUndefined(this.options.httpService)) {
      this.http = this.options.httpService;
    }
    this.initColumns();
    this.initDataProvider();
    this.render();
  }

  /**
   * Return data displayed on current grid page.
   *
   * @returns {Array<any>}
   */
  getData(): Array<any> {
    return this.data;
  }

  /**
   * Return a list of selected grid items.
   *
   * @returns {Array<any>}
   */
  getSelectedItems(): Array<any> {
    var selectedItems: Array<any> = [];

    for (let row of this.data) {
      if (row.selected) {
        selectedItems.push(row);
      }
    }

    return selectedItems;
  }

  /**
   * Return current page index.
   *
   * @returns {number}
   */
  getPageIndex(): number {
    return this.pageIndex;
  }

  /**
   * Return current page size.
   *
   * @returns {number}
   */
  getPageSize(): number {
    return this.dataProvider.pageSize;
  }

  /**
   * Return total number of grid pages.
   *
   * @returns {number}
   */
  getTotalPages(): number {
    if (this.dataProvider.pageSize === false) {
      return 1;
    }

    return Math.ceil(this.dataProvider.getTotalCount() / this.dataProvider.pageSize);
  }

  /**
   * Render data for given page.
   *
   * @param {number} pageIndex
   */
  setPageIndex(pageIndex: number) {
    this.pageIndex = pageIndex;
  }

  /**
   * Change page size to given value and render data.
   *
   * @param {number} pageSize
   */
  setPageSize(pageSize: number) {
    this.dataProvider.pageSize = pageSize;
    this.pageIndex = 1;
  }

  /**
   * Add a filter value for specific column.
   *
   * @param {string} columnName
   * @param {string} value Keyword to be used as filter for the column
   */
  setFilter(columnName: string, value: string) {
    this.dataProvider.setFilter(columnName, value);
    this.pageIndex = 1;
  }

  /**
   * Calling this method would sort the grid data by the given sort column and
   * sort type.
   *
   * @param {string} sortColumn Name of grid column to be used for sorting
   * @param {string} sortType Optional, values are 'asc' or 'desc'
   */
  setSort(sortColumn: string, sortType?: string) {
    this.dataProvider.setSort(sortColumn, sortType);
  }

  /**
   * Render grid.
   */
  render() {
    this.dataProvider.page = this.pageIndex;

    if (_.isUndefined(this.options.url)) {
      this.refresh();
    } else {
      this.dataProvider.fetch().subscribe(
        (res: Response) => {
          this.refresh();
        },
        (err: any) => {
          console.log(err);
        }
      );
    }
  }

  /**
   * Refresh grid and pagination with provider data.
   */
  protected refresh() {
    this.data = this.dataProvider.getData();
    if (!_.isEmpty(this.data) && _.isEmpty(this.columns)) {
      this.setColumnsFromData(this.data);
    }
    if (this.options.paging) {
      this.paginate();
    }
  }

  /**
   * Handle select/deselect all grid rows.
   *
   * @param {boolean} selected
   */
  protected onSelectAllCheckboxClick(selected: boolean) {
    for (let row of this.data) {
      row.selected = selected;
    }
  }

  /**
   * Handle select/deselect a single grid row.
   *
   * @param {any} row Data row
   */
  protected onSelectItemCheckboxClick(item: any) {
    if (_.isUndefined(item.selected)) {
      item.selected = false;
    }
    item.selected = !item.selected;
  }

  /**
   * Initialize data provider based on grid options.
   */
  protected initDataProvider() {
    this.dataProvider = new GridDataProvider(this.http, {
      additionalRequestParams: this.options.additionalRequestParams,
      data: this.options.data,
      pageParam: this.options.pageParam,
      pageSizeParam: this.options.pageSizeParam,
      pageSize: this.options.defaultPageSize,
      sortParam: this.options.sortParam,
      url: this.options.url
    });

    if (!_.isUndefined(this.options.defaultSortColumn)) {
      this.dataProvider.setSort(
        this.options.defaultSortColumn,
        this.options.defaultSortType
      );
    }
  }

  /**
   * Initialize grid columns based on column options.
   * If no column options are given set default options from provided data.
   */
  protected initColumns() {
    if (!_.isEmpty(this.options.columns)) {
      for (let value of this.options.columns) {
        this.columns.push(new GridColumn(value));
      }
    }
  }

  /**
   * Set grid columns from data.
   *
   * @param {Array<any>} data
   */
  protected setColumnsFromData(data: Array<any>) {
    let firstRow: any = data[0];
    for (let key in firstRow) {
      this.columns.push(new GridColumn({
        name: this.getColumnName(key, firstRow),
        heading: key
      }));
    }
  }

  /**
   * Build a list of the pages that should be display in the grid, based on
   * current page index and max button count.
   */
  protected paginate() {
    let pageButtonCount: number = Math.min(
      this.options.pageButtonCount,
      this.getTotalPages()
    );
    let offsetLeft: number = Math.floor(pageButtonCount / 2);
    let offsetRight: number = Math.ceil(pageButtonCount / 2) - 1;
    let startIndex: number = this.pageIndex - offsetLeft;
    let endIndex: number = this.pageIndex + offsetRight;

    if (startIndex < 1) {
      startIndex = 1;
      endIndex = pageButtonCount;
    } else if (endIndex > this.getTotalPages()) {
      endIndex = this.getTotalPages();
      startIndex = endIndex - pageButtonCount + 1;
    }

    this.pages = [];
    for (let i: number = startIndex; i <= endIndex; i++) {
      this.pages.push(i);
    }
  }

  /**
   * Page button click handler.
   * When invoked grid data for specific page would be rendered.
   *
   * @param {MouseEvent} event
   */
  protected onPageButtonClick(event: MouseEvent) {
    event.preventDefault();

    let element: HTMLSelectElement = event.target as HTMLSelectElement;
    let pageIndex: number = Number(element.getAttribute('data-page'));

    this.setPageIndex(pageIndex);
    this.render();
  }

  /**
   * Check if page size options are enabled.
   *
   * @returns {boolean}
   */
  protected isPageSizeOptionsEnabled(): boolean {
    return this.options.paging && (!_.isEmpty(this.options.pageSizeOptions)
      || this.options.pageSizeOptions !== false);
  }

  /**
   * Page size drop-down change handler.
   * When invoked the page size of the grid would be changed and data would be
   * re-rendered.
   *
   * @param {MouseEvent} event
   */
  protected onPageSizeDropDownChange(event: MouseEvent) {
    let element: HTMLSelectElement = event.target as HTMLSelectElement;
    let pageSize: number = Number(element.options.item(element.selectedIndex).innerHTML);

    this.setPageSize(pageSize);
    this.render();
  }

  /**
   * Filter input blur handler.
   * When invoked a filter would be set with the input value.
   *
   * @param {MouseEvent} event
   */
  protected onFilterInputBlur(event: MouseEvent) {
    let element: HTMLInputElement = event.target as HTMLInputElement;
    let columnName: string = element.getAttribute('name');
    let keyword: string = element.value.trim();

    this.setFilter(columnName, keyword);
  }

  /**
   * Filter input enter key hanlder.
   * When invoked a filter would be set with the input value and the grid
   * filter would be triggered.
   *
   * @param {MouseEvent} event
   */
  protected onFilterInputEnter(event: MouseEvent) {
    this.onFilterInputBlur(event);

    this.render();
  }

  /**
   * Grid heading click handler.
   * When invoked the grid would be sorted by the clicked column.
   *
   * @param {MouseEvent} event
   */
  protected onHeadingClick(event: MouseEvent) {
    let element: HTMLElement = event.target as HTMLElement;
    let columnName: string = element.getAttribute('data-id');
    let column: GridColumn = _.find(this.columns, function(item: any) {
      return item.name === columnName;
    });

    if (this.isSortingAllowed(column)) {
      this.setSort(columnName, this.getSortType(column));
      this.render();
    } else {
      console.log('Sorting by "' + column.name + '" is not allowed.');
    }
  }

  /**
   * Check if data is sorted by specific column and type.
   *
   * @param {GridColumn} column
   * @param {string} sortType Optional, if given method would also check
   * current sort type value
   * @returns {boolean}
   */
  protected isSortedBy(column: GridColumn, sortType?: string): boolean {
    let isOrderedByField: boolean =
        column.name === this.dataProvider.getSortColumn();

    if (_.isUndefined(sortType)) {
      return isOrderedByField;
    }

    return isOrderedByField && this.dataProvider.getSortType() === sortType;
  }

  /**
   * Determine sort type by column name.
   * If column name is different from current sort column the order type would
   * be preserved, otherwise the sort type would be changed to the opposite.
   *
   * @param {GridColumn} column
   * @returns {string}
   */
  protected getSortType(column: GridColumn): string {
    return column.name !== this.dataProvider.getSortColumn() ?
      this.dataProvider.getSortType() :
        (this.dataProvider.getSortType() === GridSort.TYPE_ASC ?
          GridSort.TYPE_DESC : GridSort.TYPE_ASC);
  }

  /**
   * Check if sorting is allowed for specific grid column.
   *
   * @param {GridColumn} column
   * @returns {boolean}
   */
  protected isSortingAllowed(column: GridColumn): boolean {
    return this.options.sorting && column.sorting;
  }

  /**
   * Determine the column name used in column options.
   *
   * @param {string} key Data item key
   * @param {any} row Data item, could be primitive data type or an object
   * @returns {string}
   */
  protected getColumnName(key: string, row: any): string {
    if (_.isObject(row[key])) {
      return key.concat('.', this.getNestedKey(row[key]));
    }

    return key;
  }

  /**
   * Get full key name from nested object.
   *
   * @param {any} object Nested object to be iterated
   * @returns {string}
   * @example
   * var object: any = {country: { name: { officialName: "People's Republic of China", name: "China" }, id: 6 }}
   * var nestedKey: string = this.getNestedKey(object);
   * console.log(nestedKey); // will output 'country.name.officialName'
   */
  private getNestedKey(object: any): string {
    let firstKey: string = _.keys(object)[0];
    let firstKeyValue: any = object[firstKey];

    if (_.isObject(firstKeyValue)) {
      firstKey.concat('.', this.getNestedKey(firstKeyValue));
    }

    return firstKey;
  }
}
