import { Action, ActionPanel, Detail, environment, Form, Icon, LocalStorage, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { renderToString } from "react-dom/server";

function getImage(text) {
  text = text.toString();
  const img = (
      <svg viewBox={`0 0 300 700`} xmlns="http://www.w3.org/2000/svg">
        <text
          x="50%"
          y="50%"
          fill={environment.theme === "dark" ? "#fff" : "#000"}
          fontSize="200"
          fontFamily="-apple-system"
          textLength="700"
          lengthAdjust="spacing"
        >
          {text}
        </text>
      </svg>
    );
    return `"data:image/svg+xml,${encodeURIComponent(renderToString(img))}"`;
}

function renderText(text, prefetchedData) {
  let image;
  if (prefetchedData && prefetchedData[text]) {
    image = prefetchedData[text];
  }
  else {
    image = getImage(text);
  }
  return `<img height="300" width="700" src=${image} />`;
}

const defaultData = {
  counters: [
    { id: 0, name: "Counter", count: 0, increment: 1, modulo: 0 },
  ],
  currentCounter: 0,
};

function getCounter(data) {
  return data.counters.find((c) => c.id === data.currentCounter);
}

function getCount(data) {
  if (!data) return 0;
  return getCounter(data).count;
}

async function getData(key = "data", defaultValue = defaultData) {
  try {
    return JSON.parse(await LocalStorage.getItem(key));
  }
  catch {
    await writeData(defaultValue, key);
    return defaultValue;
  }
}

async function writeData(data, key = "data") {
  await LocalStorage.setItem(key, JSON.stringify(data));
}

const defaultPrefetchedData = {};

export default function Command() {
  let [data, setData] = useState(null);
  let [prefetchedData, setPrefetchedData] = useState(null);

  const Settings = () => {
    const { pop } = useNavigation();
    const counter = getCounter(data);
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save" onSubmit={(values) => {
              setData((data) => {
                let newData = structuredClone(data);
                let counter = getCounter(newData);
                counter.count = parseInt(values.count);
                counter.increment = parseInt(values.increment);
                counter.modulo = parseInt(values.modulo);
                return newData;
              });
              pop();
            }} />
          </ActionPanel>
        }
      >
        <Form.TextField id="count" title="Count" defaultValue={counter.count.toString()} />
        <Form.TextField id="increment" title="Increment" defaultValue={counter.increment.toString()} />
        <Form.TextField id="modulo" title="Modulo" defaultValue={counter.modulo.toString()} />
      </Form>
    );
  };

  const SwitchCounters = () => {
    const { pop } = useNavigation();
    const dropdown = (
      <Form.Dropdown id="counter" title="Counter" defaultValue={data.currentCounter}>
        {data.counters.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>
    );
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Switch" onSubmit={(values) => {
              setData((data) => {
                let newData = structuredClone(data);
                newData.currentCounter = values.counter;
                return newData;
              });
              pop();
            }} />
          </ActionPanel>
        }
      >
        {dropdown}
      </Form>
    );
  }

  const CreateCounter = () => {
    const { pop } = useNavigation();
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Create" onSubmit={(values) => {
              setData((data) => {
                let newData = structuredClone(data);
                newData.counters.push({
                  id: newData.counters.length,
                  name: values.name,
                  count: parseInt(values.count),
                  increment: parseInt(values.increment),
                  modulo: parseInt(values.modulo),
                });
                return newData;
              });
              pop();
            }} />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" defaultValue="Counter" />
        <Form.TextField id="count" title="Count" defaultValue={"0"} />
        <Form.TextField id="increment" title="Increment" defaultValue={"1"} />
        <Form.TextField id="modulo" title="Modulo" defaultValue={"0"} />
      </Form>
    );
  }

  function prefetch() {
    const counter = getCounter(data);
    let count = counter.count;
    const increment = counter.increment;

    // prefetch the image for the next 10 counts
    setPrefetchedData((data) => {
      let newData = structuredClone(data);
      for (let i = 1; i <= 10; i++) {
        count += increment;
        if (!newData[count]) {
          newData[count] = getImage(count);
        }
      }
      return newData;
    });
  }

  function incrementCount() {
    setData((data) => {
      let newData = structuredClone(data);
      let counter = getCounter(newData);
      counter.count += counter.increment;
      if (counter.modulo > 0) {
        counter.count %= counter.modulo;
      }
      return newData;
    });

    prefetch();
  }

  function resetCounter() {
  setData((data) => {
    let newData = structuredClone(data);
    let counter = getCounter(newData);
    counter.count = 0;
    return newData;
  });
}

  useEffect(() => {
    (async () => {
      setData(await getData());
      await writeData(defaultPrefetchedData, "prefetchedData");
      setPrefetchedData(defaultPrefetchedData);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (data) {
        await writeData(data);
      }
    })();
  }, [data]);

  useEffect(() => {
    (async () => {
      if (prefetchedData) {
        await writeData(prefetchedData, "prefetchedData");
      }
    })();
  }, [prefetchedData]);

  return <Detail markdown={renderText(getCount(data), prefetchedData)}
                 actions={
                    <ActionPanel>
                      <Action
                        icon={Icon.PlusCircle}
                        title="Count"
                        onAction={() => incrementCount()}
                      />
                      <Action.Push
                        icon={Icon.Gear}
                        title="Settings"
                        target={<Settings />}
                      />
                      <Action
                        icon={Icon.ArrowClockwise}
                        title="Reset Counter"
                        style={Action.Style.Destructive}
                        onAction={() => resetCounter()}
                      />
                      <Action.Push
                        icon={Icon.Switch}
                        title="Switch Counter"
                        target={<SwitchCounters />}
                      />
                      <Action.Push
                        icon={Icon.PlusTopRightSquare}
                        title="Create Counter"
                        target={<CreateCounter />}
                      />
                    </ActionPanel>
                 }
  />;
}
