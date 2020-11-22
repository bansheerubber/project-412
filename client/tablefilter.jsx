import { Input, AutoComplete, Cascader, Row, Col, Select } from 'antd';
import * as React from "react";

const { option } = Select;

export default class Tablefilter extends React.Component {
    render() {
        return (
        <Input.Group size="large">
            <Row gutter={8}>
                <Col span={5}>
                    <Input placeholder="state" defaultValue="Arizona" />
                </Col>
                <Col span={8}>
                    <Select defaultValue="Cases">
                        <Option value="Cases">Cases</Option>
                        <Option value="Deaths">Deaths</Option>
                    </Select>
                </Col>
            </Row>
        </Input.Group>
        );
    }
}