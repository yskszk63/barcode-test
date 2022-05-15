import { useCallback, useState } from "react";
import Head from "next/head";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import ZxingScanner from "../components/ZxingScanner";
import QuaggaScanner from "../components/QuaggaScanner";
import NativeScanner from "../components/NativeScanner";

type OutputItemProps = {
  kind: string;
  timestamp: Date;
  result: unknown;
}

function OutputItem({ kind, timestamp, result }: OutputItemProps): React.ReactElement {
  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="column">
          <Typography>{timestamp.toISOString()}</Typography>
          <Typography sx={{ color: "text.secondary" }}>{kind}</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ maxHeight: "20rem", overflow: "scroll" }}>
        <Box component="pre" sx={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</Box>
      </AccordionDetails>
    </Accordion>
  );
}

export default function Home(): React.ReactElement {
  const [kind, setKind] = useState("");
  const [scan, setScan] = useState(false);
  const [outputs, setOutputs] = useState<(OutputItemProps & { uuid: string } )[]>([]);
  const onResult = useCallback((result: unknown) => {
    setOutputs([{ kind, timestamp: new Date(), result, uuid: crypto.randomUUID() }, ...outputs]);
  }, [kind, outputs, setOutputs]);

  return (
    <>
      <Head>
        <title>Barcode test</title>
      </Head>

      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="a" href="/" sx={{ color: "inherit", textDecoration: "none" }}>Barcode test</Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ my: "1rem", display: "flex" }}>
        <Stack direction="column" flexGrow={1}>
          <FormControl fullWidth>
            <FormLabel>Kind</FormLabel>
            <RadioGroup row value={kind} onChange={(_, value) => setKind(value)}>
              <FormControlLabel label="ZXing" value="zxing" control={ <Radio /> } />
              <FormControlLabel label="Quagga" value="quagga" control={ <Radio /> } />
              <FormControlLabel label="native" value="native" control={ <Radio /> } />
            </RadioGroup>
            <Box display="flex">
              <Box flexGrow={1} />
              <Button disabled={kind === ""} variant="contained" onClick={() => setScan(!scan)}>{ !scan ? "start" : "stop" }</Button>
            </Box>
          </FormControl>

          <Box mt="1em" mx="auto" sx={{ "& video": { width: "100%" }, "& canvas": { display: "none" }, visibility: scan ? "unset" : "hidden" }}>
            {kind === "zxing" && <ZxingScanner scan={scan} onResult={onResult}/>}
            {kind === "quagga" && <QuaggaScanner scan={scan} onResult={onResult}/>}
            {kind === "native" && <NativeScanner scan={scan} onResult={onResult}/>}
          </Box>

          <Stack direction="column" flexGrow={1}>
            {outputs.map((item) => <OutputItem {...item} key={item.uuid} />)}
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
