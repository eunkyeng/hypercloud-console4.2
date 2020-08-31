/* eslint-disable no-undef */
import * as _ from 'lodash-es';
import * as React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { k8sCreate, k8sUpdate } from '../../module/k8s';
import { ButtonBar, history, kindObj, SelectorInput } from '../utils';
import { useTranslation } from 'react-i18next';
import { NsDropdown } from '../RBAC';
import { formatNamespacedRouteForResource } from '../../ui/ui-actions';
import { SelectKeyValueEditor } from '../utils/select-key-value-editor';

const Section = ({ label, children, isRequired, paddingTop }) => {
  return (
    <div className={`row form-group ${isRequired ? 'required' : ''}`}>
      <div className="col-xs-2 control-label" style={{ paddingTop: paddingTop }}>
        <strong>{label}</strong>
      </div>
      <div className="col-xs-10">{children}</div>
    </div>
  );
};

class ResourceQuotaClaimFormComponent extends React.Component {
  constructor(props) {
    super(props);
    const existingResourceQuotaClaim = _.pick(props.obj, ['metadata', 'type']);
    const resourceQuotaClaim = _.defaultsDeep({}, props.fixed, existingResourceQuotaClaim, {
      apiVersion: 'tmax.io/v1',
      kind: 'ResourceQuotaClaim',
      metadata: {
        name: '',
        namespace: '',
        labels: {
          handled: 'f',
        },
      },
      resourceName: '',
      spec: {
        hard: {
          'limits.cpu': '',
          'limits.memory': '',
        },
      },
    });

    this.state = {
      resourceQuotaClaimTypeAbstraction: this.props.resourceQuotaClaimTypeAbstraction,
      resourceQuotaClaim: resourceQuotaClaim,
      inProgress: false,
      type: 'form',
      quota: [['', '']],
      isDuplicated: false,
      inputError: {
        name: null,
        namespace: null,
        resourceName: null,
      },
    };
    this.onResourceNameChanged = this.onResourceNameChanged.bind(this);
    this.onNameChanged = this.onNameChanged.bind(this);
    this.onNamespaceChanged = this.onNamespaceChanged.bind(this);
    this.onLabelChanged = this.onLabelChanged.bind(this);
    this._updateQuota = this._updateQuota.bind(this);
    this.save = this.save.bind(this);
  }
  onResourceNameChanged(event) {
    let resourceQuotaClaim = { ...this.state.resourceQuotaClaim };
    resourceQuotaClaim.resourceName = String(event.target.value);
    this.setState({ resourceQuotaClaim });
  }
  onNameChanged(event) {
    let resourceQuotaClaim = { ...this.state.resourceQuotaClaim };
    resourceQuotaClaim.metadata.name = String(event.target.value);
    this.setState({ resourceQuotaClaim });
  }
  onNamespaceChanged(namespace) {
    let resourceQuotaClaim = { ...this.state.resourceQuotaClaim };
    resourceQuotaClaim.metadata.namespace = String(namespace);
    this.setState({ resourceQuotaClaim });
  }
  onLabelChanged(event) {
    let resourceQuotaClaim = { ...this.state.resourceQuotaClaim };
    if (event.length !== 0) {
      event.forEach(item => {
        if (item.split('=')[1] === undefined) {
          document.getElementById('labelErrMsg').style.display = 'block';
          event.pop(item);
          return;
        }
        document.getElementById('labelErrMsg').style.display = 'none';
        resourceQuotaClaim.metadata.labels[item.split('=')[0]] = item.split('=')[1];
      });
    }
    this.setState({ resourceQuotaClaim });
  }
  onQuotaChanged = (event) => {
    let resourceQuotaClaim = { ...this.state.resourceQuotaClaim };
    resourceQuotaClaim.spec.hard[event.target.id] = String(event.target.value);
    this.setState({ resourceQuotaClaim });
  }
  _updateQuota(quota) {
    this.setState({
      quota: quota.keyValuePairs,
      isDuplicated: quota.isDuplicated,
    });
  }

  isRequiredFilled = (k8sResource, item, element) => {
    const { t } = this.props;
    if (k8sResource.metadata[item] === '') {
      switch (item) {
        case 'name':
          this.setState({ inputError: { name: t(`VALIDATION:EMPTY-${element}`, { something: t(`CONTENT:NAME`) }) } });
          return false;
        case 'namespace':
          this.setState({ inputError: { namespace: t(`VALIDATION:EMPTY-${element}`, { something: t(`CONTENT:NAMESPACE`) }) } });
          return false;
      }
    } else if (k8sResource[item] === '') {
      this.setState({ inputError: { resourceName: t(`VALIDATION:EMPTY-${element}`, { something: t(`CONTENT:RESOURCENAME`) }) } });
      return false;
    } else {
      this.setState({
        inputError: {
          [item]: null,
        },
      });
      return true;
    }
  };

  onFocusName = () => {
    this.setState({
      inputError: {
        name: null,
      },
    });
  };

  onFocusNamespace = () => {
    this.setState({
      inputError: {
        namespace: null,
      },
    });
  };

  onFocusResourceName = () => {
    this.setState({
      inputError: {
        resourceName: null,
      },
    });
  };

  save(e) {
    e.preventDefault();
    const { kind, metadata } = this.state.resourceQuotaClaim;
    this.setState({ inProgress: true });
    const newResourceQuotaClaim = _.assign({}, this.state.resourceQuotaClaim);

    if (!this.isRequiredFilled(newResourceQuotaClaim, 'name', 'INPUT') || !this.isRequiredFilled(newResourceQuotaClaim, 'namespace', 'SELECT') || !this.isRequiredFilled(newResourceQuotaClaim, 'resourceName', 'INPUT')) {
      this.setState({ inProgress: false });
      return;
    }

    if (this.state.isDuplicated) {
      this.setState({ inProgress: false });
      return;
    }

    // quota 데이터 가공
    let quota = {};
    quota["limits.cpu"] = this.state.resourceQuotaClaim.spec.hard["limits.cpu"];
    quota["limits.memory"] = this.state.resourceQuotaClaim.spec.hard["limits.memory"];
    this.state.quota.forEach(arr => {
      const key = arr[0] === 'etc' ? arr[1] : arr[0];
      quota[key] = arr[2];
    });

    if (quota !== {}) {
      Object.assign(newResourceQuotaClaim.spec.hard, quota);
    }

    const ko = kindObj(kind);
    (this.props.isCreate ? k8sCreate(ko, newResourceQuotaClaim) : k8sUpdate(ko, newResourceQuotaClaim, metadata.namespace, newResourceQuotaClaim.metadata.name)).then(
      () => {
        this.setState({ inProgress: false });
        history.push(formatNamespacedRouteForResource('resourcequotaclaims'));
      },
      err => this.setState({ error: err.message, inProgress: false }),
    );
  }

  render() {
    const { t } = this.props;

    const resourceQuotaClaimOptions = [
      {
        value: 'requests.cpu',
        label: 'CPU Requests',
      },
      {
        value: 'requests.memory',
        label: 'Memory Requests',
      },
      {
        value: 'pods',
        label: t('CONTENT:NUMBEROFPODS'),
      },
      {
        value: 'etc',
        label: t('CONTENT:OTHERS'),
      },
    ];

    return (
      <div className="rbac-edit-binding co-m-pane__body">
        <Helmet>
          <title>{t('ADDITIONAL:CREATEBUTTON', { something: t(`RESOURCE:${this.state.resourceQuotaClaim.kind.toUpperCase()}`) })}</title>
        </Helmet>
        <form className="co-m-pane__body-group co-create-secret-form" onSubmit={this.save}>
          <h1 className="co-m-pane__heading">{t('ADDITIONAL:CREATEBUTTON', { something: t(`RESOURCE:${this.state.resourceQuotaClaim.kind.toUpperCase()}`) })}</h1>
          <p className="co-m-pane__explanation">{t('STRING:RESOURCEQUOTACLAIM-CREATE-0')}</p>
          <fieldset disabled={!this.props.isCreate}>
            <Section label={t('CONTENT:NAME')} isRequired={true}>
              <input className="form-control" type="text" onChange={this.onNameChanged} onFocus={this.onFocusName} value={this.state.resourceQuotaClaim.metadata.name} id="resource-quota-claim-name" />
              {this.state.inputError.name && <p className="cos-error-title">{this.state.inputError.name}</p>}
            </Section>
            <Section label={t('CONTENT:NAMESPACE')} isRequired={true}>
              <NsDropdown id="resource-quota-claim-namespace" t={t} onChange={this.onNamespaceChanged} onFocus={this.onFocusNamespace} />
              {this.state.inputError.namespace && <p className="cos-error-title">{this.state.inputError.namespace}</p>}
            </Section>
            <Section label={t('CONTENT:LABELS')} isRequired={false}>
              <SelectorInput desc={t('STRING:RESOURCEQUOTA-CREATE-1')} isFormControl={true} labelClassName="co-text-namespace" tags={[]} onChange={this.onLabelChanged} />
              <div id="labelErrMsg" style={{ display: 'none', color: 'red' }}>
                <p>{t('VALIDATION:LABEL_FORM')}</p>
              </div>
            </Section>
            <Section label={t('CONTENT:RESOURCENAME')} isRequired={true}>
              <input className="form-control" type="text" onChange={this.onResourceNameChanged} value={this.state.resourceQuotaClaim.resourceName} onFocus={this.onFocusResourceName} id="resource-quota-claim-resource-name" />
              {this.state.inputError.resourceName && <p className="cos-error-title">{this.state.inputError.resourceName}</p>}
            </Section>
            <Section label={t('CONTENT:NAMESPACERESOURCEQUOTA')} isRequired={false} paddingTop={'5px'}>
              <div className="row">
                <div className="col-md-2 col-xs-2 pairs-list__name-field">
                  <div>CPU Limits</div>
                </div>
                <div className="col-md-2 col-xs-2 pairs-list__name-field" id='cpu'>
                  <input className="form-control" type="text"
                    onChange={this.onQuotaChanged} id="limits.cpu"
                    placeholder='CPU' value={this.state.resourceQuotaClaim.spec.hard['limits.cpu']} required />
                </div>
              </div>
              <div className="row">
                <div className="col-md-2 col-xs-2 pairs-list__name-field">
                  <div>Memory Limits</div>
                </div>
                <div className="col-md-2 col-xs-2 pairs-list__name-field" id='memory'>
                  <input className="form-control" type="text" id="limits.memory"
                    onChange={this.onQuotaChanged} placeholder='Memory' value={this.state.resourceQuotaClaim.spec.hard['limits.memory']} required />
                </div>
              </div>
              <SelectKeyValueEditor desc={t('STRING:RESOURCEQUOTA-CREATE-2')} t={t} anotherDesc={t('STRING:RESOURCEQUOTA-CREATE-3')} options={resourceQuotaClaimOptions} keyValuePairs={this.state.quota} keyString="resourcetype" valueString="value" updateParentData={this._updateQuota} isDuplicated={this.state.isDuplicated} />
            </Section>
            <ButtonBar errorMessage={this.state.error} inProgress={this.state.inProgress}>
              <button type="submit" className="btn btn-primary" id="save-changes">
                {t('CONTENT:CREATE')}
              </button>
              <Link to={formatNamespacedRouteForResource('resourcequotaclaims')} className="btn btn-default" id="cancel">
                {t('CONTENT:CANCEL')}
              </Link>
            </ButtonBar>
          </fieldset>
        </form>
      </div>
    );
  }
}

export const CreateResouceQuotaClaim = ({ match: { params } }) => {
  const { t } = useTranslation();
  return <ResourceQuotaClaimFormComponent t={t} fixed={{ metadata: { namespace: params.ns } }} resourceQuotaClaimTypeAbstraction={params.type} titleVerb="Create" isCreate={true} />;
};
