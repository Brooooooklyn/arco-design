import React, {
  forwardRef,
  useContext,
  useRef,
  useState,
  useImperativeHandle,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { CSSTransition } from 'react-transition-group';
import { findDOMNode } from 'react-dom';
import cs from '../_util/classNames';
import { on, off, isServerRendering } from '../_util/dom';
import ResizeObserver from '../_util/resizeObserver';
import IconLoading from '../../icon/react-icon/IconLoading';
import IconZoomOut from '../../icon/react-icon/IconZoomOut';
import IconZoomIn from '../../icon/react-icon/IconZoomIn';
import IconFullscreen from '../../icon/react-icon/IconFullscreen';
import IconClose from '../../icon/react-icon/IconClose';
import IconRotateLeft from '../../icon/react-icon/IconRotateLeft';
import IconRotateRight from '../../icon/react-icon/IconRotateRight';
import IconOriginalSize from '../../icon/react-icon/IconOriginalSize';

import ConfigProvider, { ConfigContext } from '../ConfigProvider';
import { ImagePreviewProps } from './interface';
import useImageStatus from './utils/hooks/useImageStatus';
import getScale, { minScale, maxScale } from './utils/getScale';
import getFixTranslate from './utils/getFixTranslate';
import ImagePreviewToolbar from './image-preview-toolbar';
import useMergeValue from '../_util/hooks/useMergeValue';
import Portal from '../Portal';
import { PreviewGroupContext } from './previewGroupContext';
import ImagePreviewArrow from './image-preview-arrow';
import useOverflowHidden from '../_util/hooks/useOverflowHidden';

const ROTATE_STEP = 90;

export type ImagePreviewHandle = {
  reset: () => void;
};

function Preview(props: ImagePreviewProps, ref) {
  const {
    className,
    style,
    src,
    defaultVisible,
    maskClosable = true,
    closable = true,
    breakPoint = 316,
    actions,
    actionsLayout = [
      'fullScreen',
      'rotateRight',
      'rotateLeft',
      'zoomIn',
      'zoomOut',
      'originalSize',
      'extra',
    ],
    getPopupContainer = () => document.body,
    onVisibleChange,
  } = props;

  const { previewGroup, previewUrlMap, currentId, setCurrentId, infinite } = useContext(
    PreviewGroupContext
  );
  const mergedSrc = previewGroup ? previewUrlMap.get(currentId) : src;
  const previewUrlIdList = Array.from(previewUrlMap.keys());
  const currentIndex = previewUrlIdList.indexOf(currentId);

  const [visible, setVisible] = useMergeValue(false, {
    defaultValue: defaultVisible,
    value: props.visible,
  });

  const { getPrefixCls, locale } = useContext(ConfigContext);
  const prefixCls = getPrefixCls('image');
  const previewPrefixCls = `${prefixCls}-preview`;
  const classNames = cs(
    previewPrefixCls,
    {
      [`${previewPrefixCls}-hide`]: !visible,
    },
    className
  );

  const refImage = useRef<HTMLImageElement>();
  const refImageContainer = useRef<HTMLDivElement>();
  const refWrapper = useRef<HTMLDivElement>();

  const refMoveData = useRef({
    pageX: 0,
    pageY: 0,
    originX: 0,
    originY: 0,
  });

  const { isLoading, isLoaded, setStatus } = useImageStatus('loading');
  const [toolbarSimple, setToolbarSimple] = useState(false);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [scaleValueVisible, setScaleValueVisible] = useState(false);
  const [rotate, setRotate] = useState(0);
  const [moving, setMoving] = useState(false);

  // Reset image params
  function reset() {
    setTranslate({ x: 0, y: 0 });
    setScale(1);
    setRotate(0);
  }

  useImperativeHandle<ImagePreviewHandle, ImagePreviewHandle>(ref, () => ({
    reset,
  }));

  const [container, setContainer] = useState<HTMLElement>();
  const getContainer = useCallback(() => container, [container]);
  useEffect(() => {
    const container = getPopupContainer && getPopupContainer();
    const containerDom = (findDOMNode(container) || document.body) as HTMLElement;
    setContainer(containerDom);
  }, [getPopupContainer]);

  useOverflowHidden(getContainer, { hidden: visible });

  const isFixed = useMemo(() => !isServerRendering && container === document.body, [container]);

  // Jump to image at the specified index
  function jumpTo(index: number) {
    const previewListLen = previewUrlIdList.length;
    if (infinite) {
      index %= previewListLen;
      if (index < 0) index = previewListLen - Math.abs(index);
    }
    if (index !== currentIndex && index >= 0 && index <= previewListLen - 1) {
      const nextId = previewUrlIdList[index];
      setCurrentId(nextId);
    }
  }

  function onPrev() {
    jumpTo(currentIndex - 1);
  }

  function onNext() {
    jumpTo(currentIndex + 1);
  }

  // Anticlockwise rotation
  function onRotateLeft() {
    setRotate(rotate === 0 ? 360 - ROTATE_STEP : rotate - ROTATE_STEP);
  }

  // Clockwise rotation
  function onRotateRight() {
    setRotate((rotate + ROTATE_STEP) % 360);
  }

  // Scale
  const hideScaleTimer = useRef(null);
  const showScaleValue = () => {
    !scaleValueVisible && setScaleValueVisible(true);
    hideScaleTimer.current && clearTimeout(hideScaleTimer.current);
    hideScaleTimer.current = setTimeout(() => {
      setScaleValueVisible(false);
    }, 1000);
  };
  const onScaleChange = (newScale) => {
    if (scale !== newScale) {
      setScale(newScale);
      showScaleValue();
    }
  };

  function onZoomIn() {
    const newScale = getScale(scale, 'zoomIn');
    onScaleChange(newScale);
  }

  function onZoomOut() {
    const newScale = getScale(scale, 'zoomOut');
    onScaleChange(newScale);
  }

  function onResetScale() {
    onScaleChange(1);
  }

  function onFullScreen() {
    const wrapperRect = refWrapper.current.getBoundingClientRect();
    const imgRect = refImage.current.getBoundingClientRect();
    const newHeightScale = wrapperRect.height / (imgRect.height / scale);
    const newWidthScale = wrapperRect.width / (imgRect.width / scale);
    const newScale = Math.max(newHeightScale, newWidthScale);
    onScaleChange(newScale);
  }

  // Image container is clicked
  function onOutsideImgClick(e) {
    if (e.target === e.currentTarget && maskClosable) {
      close();
    }
  }

  // Close button is clicked.
  function onCloseClick() {
    close();
  }

  function close() {
    if (visible) {
      onVisibleChange && onVisibleChange(false, visible);
      setVisible(false);
    }
  }

  function onWrapperResize(entry) {
    if (entry && entry.length) {
      const wrapperRect = entry[0].contentRect;
      const nextSimple = wrapperRect.width < breakPoint;
      setToolbarSimple(nextSimple);
    }
  }

  // Check the translate and correct it if needed
  const checkAndFixTranslate = () => {
    if (!refWrapper.current || !refImage.current) return;
    const wrapperRect = refWrapper.current.getBoundingClientRect();
    const imgRect = refImage.current.getBoundingClientRect();
    const [x, y] = getFixTranslate(wrapperRect, imgRect, translate.x, translate.y, scale);
    if (x !== translate.x || y !== translate.y) {
      setTranslate({
        x,
        y,
      });
    }
  };

  // Update position on moving if needed
  const onMoving = (e) => {
    if (visible && moving) {
      e.preventDefault && e.preventDefault();
      const { originX, originY, pageX, pageY } = refMoveData.current;
      const nextX = originX + (e.pageX - pageX) / scale;
      const nextY = originY + (e.pageY - pageY) / scale;
      setTranslate({
        x: nextX,
        y: nextY,
      });
    }
  };

  const onMoveEnd = (e) => {
    e.preventDefault && e.preventDefault();
    setMoving(false);
  };

  // Record position data on move start
  const onMoveStart = (e) => {
    e.preventDefault && e.preventDefault();
    setMoving(true);

    const ev = e.type === 'touchstart' ? e.touches[0] : e;
    refMoveData.current.pageX = ev.pageX;
    refMoveData.current.pageY = ev.pageY;
    refMoveData.current.originX = translate.x;
    refMoveData.current.originY = translate.y;
  };

  useEffect(() => {
    if (visible && moving) {
      on(document, 'mousemove', onMoving, false);
      on(document, 'mouseup', onMoveEnd, false);
    }
    return () => {
      off(document, 'mousemove', onMoving, false);
      off(document, 'mouseup', onMoveEnd, false);
    };
  }, [visible, moving]);

  // Correct translate after moved
  useEffect(() => {
    if (!moving) {
      checkAndFixTranslate();
    }
  }, [moving, translate]);

  // Correct translate when scale changes
  useEffect(() => {
    checkAndFixTranslate();
  }, [scale]);

  // Reset when preview is opened
  useEffect(() => {
    if (visible) {
      reset();
    }
  }, [visible]);

  // Reset on first mount or image switches
  useEffect(() => {
    setStatus('loading');
    reset();
  }, [mergedSrc]);

  const defaultActions = [
    {
      key: 'fullScreen',
      name: locale.ImagePreview.fullScreen,
      content: <IconFullscreen />,
      onClick: onFullScreen,
    },
    {
      key: 'rotateRight',
      name: locale.ImagePreview.rotateRight,
      content: <IconRotateRight />,
      onClick: onRotateRight,
    },
    {
      key: 'rotateLeft',
      name: locale.ImagePreview.rotateLeft,
      content: <IconRotateLeft />,
      onClick: onRotateLeft,
    },
    {
      key: 'zoomIn',
      name: locale.ImagePreview.zoomIn,
      content: <IconZoomIn />,
      onClick: onZoomIn,
      disabled: scale === maxScale,
    },
    {
      key: 'zoomOut',
      name: locale.ImagePreview.zoomOut,
      content: <IconZoomOut />,
      onClick: onZoomOut,
      disabled: scale === minScale,
    },
    {
      key: 'originalSize',
      name: locale.ImagePreview.originalSize,
      content: <IconOriginalSize />,
      onClick: onResetScale,
    },
  ];

  return (
    <Portal visible={visible} forceRender={false} getContainer={getContainer}>
      <ConfigProvider getPopupContainer={() => refWrapper.current}>
        <div
          className={classNames}
          style={{
            ...(style || {}),
            ...(isFixed ? {} : { zIndex: 'inherit', position: 'absolute' }),
          }}
        >
          <CSSTransition
            in={visible}
            timeout={400}
            appear
            classNames="fadeImage"
            mountOnEnter
            unmountOnExit={false}
            onEnter={(e) => {
              e.parentNode.style.display = 'block';
              e.style.display = 'block';
            }}
            onExited={(e) => {
              e.parentNode.style.display = '';
              e.style.display = 'none';
            }}
          >
            <div className={`${previewPrefixCls}-mask`} />
          </CSSTransition>
          {visible && (
            <ResizeObserver onResize={onWrapperResize}>
              <div
                ref={refWrapper}
                className={`${previewPrefixCls}-wrapper`}
                onClick={onOutsideImgClick}
              >
                <div
                  ref={refImageContainer}
                  className={`${previewPrefixCls}-img-container`}
                  style={{ transform: `scale(${scale}, ${scale})` }}
                  onClick={onOutsideImgClick}
                >
                  <img
                    ref={refImage}
                    className={cs(`${previewPrefixCls}-img`, {
                      [`${previewPrefixCls}-img-moving`]: moving,
                    })}
                    key={mergedSrc}
                    src={mergedSrc}
                    style={{
                      transform: `translate(${translate.x}px, ${translate.y}px) rotate(${rotate}deg)`,
                    }}
                    onLoad={() => {
                      setStatus('loaded');
                    }}
                    onError={() => {
                      setStatus('error');
                    }}
                    onMouseDown={onMoveStart}
                  />
                  {isLoading && (
                    <div className={`${previewPrefixCls}-loading`}>
                      <IconLoading />
                    </div>
                  )}
                </div>
                <CSSTransition
                  in={scaleValueVisible}
                  timeout={400}
                  appear
                  classNames="fadeImage"
                  unmountOnExit
                >
                  <div className={`${previewPrefixCls}-scale-value`}>
                    {(scale * 100).toFixed(0)}%
                  </div>
                </CSSTransition>
                {isLoaded && (
                  <ImagePreviewToolbar
                    prefixCls={prefixCls}
                    previewPrefixCls={previewPrefixCls}
                    actions={actions}
                    actionsLayout={actionsLayout}
                    defaultActions={defaultActions}
                    simple={toolbarSimple}
                  />
                )}
                {closable && (
                  <div className={`${previewPrefixCls}-close-btn`} onClick={onCloseClick}>
                    <IconClose />
                  </div>
                )}
                {previewGroup && (
                  <ImagePreviewArrow
                    previewCount={previewUrlIdList.length}
                    current={currentIndex}
                    infinite={infinite}
                    onPrev={onPrev}
                    onNext={onNext}
                  />
                )}
              </div>
            </ResizeObserver>
          )}
        </div>
      </ConfigProvider>
    </Portal>
  );
}

const PreviewComponent = forwardRef<ImagePreviewHandle, ImagePreviewProps>(Preview);

PreviewComponent.displayName = 'ImagePreview';

export default PreviewComponent;
