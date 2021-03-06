import * as React from 'react';
import * as FocusTrap from 'focus-trap-react';
import { Button, Flex, FlexItem, FlexModifiers } from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import Popper from '../../../../../console-shared/src/components/popper/Popper';
import {
  KebabItem,
  KebabOption
} from '../../../../../../public/components/utils';
import { observer, Node, NodeModel } from '../../../../../topology/src';
import { PipelineResourceTask } from '../../../utils/pipeline-augment';
import { NewTaskNodeCallback, TaskListNodeModelData } from './types';
import { useTranslation } from 'react-i18next';
import './TaskListNode.scss';

const taskToOption = (
  task: PipelineResourceTask,
  callback: NewTaskNodeCallback
): KebabOption => {
  const {
    metadata: { name }
  } = task;

  return {
    label: name,
    callback: () => {
      callback(task);
    }
  };
};

type TaskListNodeProps = {
  element: Node<NodeModel, TaskListNodeModelData>;
  unselectedText?: string;
};

const TaskListNode: React.FC<TaskListNodeProps> = ({
  element,
  unselectedText
}) => {
  const triggerRef = React.useRef(null);
  const [isMenuOpen, setMenuOpen] = React.useState(false);
  const { height, width } = element.getBounds();
  const {
    clusterTaskList,
    namespaceTaskList,
    onNewTask,
    onRemoveTask
  } = element.getData();
  const { t } = useTranslation();
  const options = [
    ...namespaceTaskList.map(task => taskToOption(task, onNewTask)),
    ...clusterTaskList.map(task => taskToOption(task, onNewTask))
  ];

  return (
    <foreignObject
      width={width}
      height={height}
      className="odc-task-list-node"
      style={{
        border: '1px solid #ACB0BC',
        borderRadius: '2px'
      }}
    >
      <div className="odc-task-list-node__trigger-background" ref={triggerRef}>
        <Button
          className="odc-task-list-node__trigger"
          isDisabled={options.length === 0}
          onClick={() => {
            setMenuOpen(!isMenuOpen);
          }}
          variant="control"
          style={{ backgroundColor: '#ffffff' }}
        >
          {options.length === 0 ? (
            'No Tasks'
          ) : (
            <Flex
              breakpointMods={[
                { modifier: FlexModifiers.nowrap },
                { modifier: FlexModifiers['space-items-none'] }
              ]}
              style={{ textAlign: 'left' }}
            >
              <FlexItem
                className="odc-task-list-node__label"
                breakpointMods={[{ modifier: FlexModifiers.grow }]}
                style={{ fontSize: '13px' }}
              >
                {unselectedText || t('STRING:PIPELINE-CREATE_2')}
              </FlexItem>
              <FlexItem>
                <CaretDownIcon />
              </FlexItem>
            </Flex>
          )}
        </Button>
      </div>
      <Popper
        open={isMenuOpen}
        placement="bottom-start"
        closeOnEsc
        closeOnOutsideClick
        onRequestClose={e => {
          if (!e || !triggerRef?.current?.contains(e.target as Element)) {
            setMenuOpen(false);
          }
        }}
        reference={() => triggerRef.current}
      >
        <FocusTrap
          focusTrapOptions={{
            clickOutsideDeactivates: true,
            returnFocusOnDeactivate: false
          }}
        >
          <div className="pf-c-dropdown pf-m-expanded">
            <ul
              className="pf-c-dropdown__menu pf-m-align-right oc-kebab__popper-items odc-task-list-node__list-items"
              style={{
                position: 'initial',
                backgroundColor: '#ffffff',
                listStyle: 'none',
                padding: '0',
                marginBottom: '0px',
                overflowX: 'hidden'
              }}
            >
              {options.map(option => (
                <li key={option.label}>
                  <KebabItem
                    option={option}
                    onClick={() => {
                      option.callback && option.callback();
                    }}
                  />
                </li>
              ))}
              {onRemoveTask && (
                <>
                  <li>
                    <hr
                      className="odc-task-list-node__divider"
                      style={{ borderColor: '#677E9A', opacity: '0.7' }}
                    />
                  </li>
                  <li>
                    <KebabItem
                      option={{
                        label: t('ADDITIONAL:DELETE', {
                          something: t('RESOURCE:TASK')
                        }),
                        callback: onRemoveTask
                      }}
                      onClick={onRemoveTask}
                    />
                  </li>
                </>
              )}
            </ul>
          </div>
        </FocusTrap>
      </Popper>
    </foreignObject>
  );
};

export default observer(TaskListNode);
