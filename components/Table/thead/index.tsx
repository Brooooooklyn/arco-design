import React, { CSSProperties, ReactElement } from 'react';
import { TheadProps } from '../interface';
import Checkbox from '../../Checkbox';
import Column from './column';
import cs from '../../_util/classNames';
import useComponent from '../hooks/useComponent';
import { INTERNAL_EXPAND_KEY, INTERNAL_SELECTION_KEY } from '../constant';

function THead<T>(props: TheadProps<T>) {
  const {
    sorter,
    expandedRowRender,
    expandProps = {},
    onSort,
    onHandleFilter,
    onHandleFilterReset,
    onHeaderRow,
    prefixCls,
    currentFilters,
    components,
    data,
    selectedRowKeys,
    rowSelection,
    allSelectedRowKeys = [],
    groupColumns,
    stickyOffsets,
    groupStickyClassNames,
    showSorterTooltip,
  } = props;

  const { ComponentThead, ComponentHeaderRow, getHeaderComponentOperations } = useComponent(
    components
  );

  const _checkbox = rowSelection && (rowSelection.type === 'checkbox' || !('type' in rowSelection));
  const _checkAll = rowSelection && 'checkAll' in rowSelection ? rowSelection.checkAll : true;
  const isRadio = rowSelection && rowSelection.type === 'radio';

  const { columnTitle: expandColumnTitle } = expandProps;

  const currentSelectedRowKeys = selectedRowKeys.filter(
    (v) => allSelectedRowKeys.indexOf(v) !== -1
  );

  const selectionRowSpanProps = groupColumns.length > 1 ? { rowSpan: groupColumns.length } : {};

  const operationClassName = cs(`${prefixCls}-th`, `${prefixCls}-operation`);

  return (
    <ComponentThead>
      {groupColumns.map((row, index) => {
        const headerRowProps = onHeaderRow && onHeaderRow(row, index);
        const selectionNode = (_checkbox || isRadio) && index === 0 && (
          <th className={cs(operationClassName, `${prefixCls}-${isRadio ? 'radio' : 'checkbox'}`)}>
            <div className={`${prefixCls}-th-item`}>
              {_checkAll && !isRadio ? (
                <Checkbox
                  indeterminate={
                    data &&
                    currentSelectedRowKeys.length > 0 &&
                    currentSelectedRowKeys.length !== allSelectedRowKeys.length
                  }
                  checked={
                    data &&
                    currentSelectedRowKeys.length !== 0 &&
                    currentSelectedRowKeys.length === allSelectedRowKeys.length
                  }
                  disabled={!allSelectedRowKeys.length}
                  onChange={props.onCheckAll}
                />
              ) : null}
              {rowSelection && rowSelection.columnTitle}
            </div>
          </th>
        );

        const expandNode = expandedRowRender && (
          <th className={cs(operationClassName, `${prefixCls}-expand`)}>
            {expandColumnTitle && <div className={`${prefixCls}-th-item`}>{expandColumnTitle}</div>}
          </th>
        );

        const stickyClassNames = groupStickyClassNames[index];

        const headerOperations = getHeaderComponentOperations({ selectionNode, expandNode });

        return (
          <ComponentHeaderRow {...headerRowProps} key={index} className={`${prefixCls}-tr`}>
            {row.map((column, colIndex) => {
              const stickyOffset = stickyOffsets[colIndex];
              const stickyClassName = stickyClassNames[colIndex];

              if (column.$$isOperation) {
                let node = column.node;
                let isExtraOperation = true;

                if (column.title === INTERNAL_SELECTION_KEY) {
                  node = headerOperations.find((o) => o.name === 'selectionNode')?.node;
                  isExtraOperation = false;
                }

                if (column.title === INTERNAL_EXPAND_KEY) {
                  node = headerOperations.find((o) => o.name === 'expandNode')?.node;
                  isExtraOperation = false;
                }

                const operationNode = node as ReactElement;

                return React.cloneElement(operationNode, {
                  key: column.key || colIndex,
                  ...operationNode.props,
                  ...selectionRowSpanProps,
                  className: cs(
                    isExtraOperation ? operationClassName : '',
                    operationNode?.props?.className,
                    stickyClassName
                  ),
                  style: {
                    ...operationNode?.props?.style,
                    ...(column.fixed === 'left'
                      ? {
                          left: stickyOffset,
                        }
                      : {}),
                    width: column.width,
                    minWidth: column.width,
                  },
                });
              }

              const headerCellProps = column.onHeaderCell && column.onHeaderCell(column, colIndex);

              const columnClassName = cs(stickyClassName, column.className);

              const columnFixedStyle: CSSProperties = {};

              if (column.fixed === 'left') {
                columnFixedStyle.left = stickyOffset;
              }

              if (column.fixed === 'right') {
                columnFixedStyle.right = stickyOffset;
              }

              return (
                <Column<T>
                  key={column.key}
                  index={colIndex}
                  onSort={onSort}
                  onHandleFilter={onHandleFilter}
                  onHandleFilterReset={onHandleFilterReset}
                  currentSorter={sorter}
                  currentFilters={currentFilters}
                  _key={column.key || column.dataIndex || colIndex}
                  {...column}
                  column={column}
                  headerCellProps={headerCellProps}
                  prefixCls={prefixCls}
                  components={components}
                  className={columnClassName}
                  columnFixedStyle={columnFixedStyle}
                  showSorterTooltip={showSorterTooltip}
                />
              );
            })}
          </ComponentHeaderRow>
        );
      })}
    </ComponentThead>
  );
}

export default THead;
