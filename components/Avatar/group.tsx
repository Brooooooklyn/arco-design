import React, { useContext, forwardRef, PropsWithChildren } from 'react';
import cs from '../_util/classNames';
import { ConfigContext } from '../ConfigProvider';
import Avatar from './avatar';
import Popover from '../Popover';
import AvatarContext from './context';
import { AvatarGroupProps } from './interface';
import useMergeProps from '../_util/hooks/useMergeProps';

const defaultProps: AvatarGroupProps = {
  shape: 'circle',
  autoFixFontSize: true,
};

function Group(baseProps: PropsWithChildren<AvatarGroupProps>, ref) {
  const { getPrefixCls, componentConfig } = useContext(ConfigContext);
  const props = useMergeProps<PropsWithChildren<AvatarGroupProps>>(
    baseProps,
    defaultProps,
    componentConfig?.['Avatar.Group']
  );
  const {
    className,
    style,
    children,
    size,
    shape,
    autoFixFontSize,
    zIndexAscend,
    maxCount,
    maxStyle,
    maxPopoverTriggerProps,
    ...rest
  } = props;

  const prefixCls = getPrefixCls('avatar-group');
  const classNames = cs(prefixCls, className);

  const childrenArr = React.Children.toArray(children);
  const avatarCount = childrenArr.length;
  let avatarsToRender = childrenArr;

  if (maxCount && avatarCount > maxCount) {
    const avatarsInPopover = childrenArr.slice(maxCount);
    avatarsToRender = childrenArr.slice(0, maxCount);
    avatarsToRender.push(
      <Avatar
        key="_arco_avatar_group_popup"
        style={maxStyle}
        className={`${prefixCls}-max-count-avatar`}
      >
        <Popover
          triggerProps={maxPopoverTriggerProps}
          content={
            <AvatarContext.Provider value={{ size, shape, autoFixFontSize }}>
              <div className={`${prefixCls}-popover`}>{avatarsInPopover}</div>
            </AvatarContext.Provider>
          }
        >
          +{avatarsInPopover.length}
        </Popover>
      </Avatar>
    );
  }

  return (
    <div ref={ref} style={style} className={classNames} {...rest}>
      {avatarsToRender.map((item, index) => {
        const stackedStyle = {
          zIndex: zIndexAscend ? index + 1 : avatarCount - index,
          marginLeft: index !== 0 ? -size / 4 : 0,
        };
        return (
          <AvatarContext.Provider
            key={index}
            value={{ size, shape, autoFixFontSize, style: stackedStyle }}
          >
            {item}
          </AvatarContext.Provider>
        );
      })}
    </div>
  );
}

const AvatarGroupComponent = forwardRef<HTMLDivElement, PropsWithChildren<AvatarGroupProps>>(Group);

AvatarGroupComponent.displayName = 'AvatarGroup';

export default AvatarGroupComponent;
